import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { BoardColumn } from '../entities/board-column.entity.js';
import { Card } from '../entities/card.entity.js';
import { positionBetween } from '../position.js';
import {
  BoardWriteRunner,
  found,
  type BoardWrite,
  type BoardWriteResult,
} from './board-write.js';

export interface NewColumn extends BoardWrite<BoardColumn> {
  column: Pick<BoardColumn, 'id' | 'title'>;
}

export interface NewCard extends BoardWrite<Card> {
  columnId: string;
  card: Pick<Card, 'id' | 'title' | 'description' | 'createdBy'>;
}

export interface ColumnUpdate extends BoardWrite<BoardColumn> {
  columnId: string;
  changes: Pick<BoardColumn, 'title'>;
}

export interface ColumnMove extends BoardWrite<BoardColumn> {
  columnId: string;
  /** The column to place it after; null = first. */
  afterColumnId: string | null;
}

export interface ColumnRemoval extends BoardWrite<BoardColumn> {
  columnId: string;
}

export interface CardUpdate extends BoardWrite<Card> {
  cardId: string;
  changes: Pick<Card, 'title' | 'description'>;
}

export interface MovedCard {
  card: Card;
  fromColumnId: string;
}

export interface CardMove extends BoardWrite<MovedCard> {
  cardId: string;
  /** Target column (may be the current one). */
  columnId: string;
  /** The card to place it after within the target column; null = first. */
  afterCardId: string | null;
}

export interface CardRemoval extends BoardWrite<Card> {
  cardId: string;
}

/**
 * Columns and cards. Each write runs in `BoardWriteRunner`'s transaction (board row lock, role
 * check, `boards.version` bump, events to the outbox). Items are looked up within the board, so
 * ids of another board are `not_found`.
 */
@Injectable()
export class BoardContentRepository {
  constructor(private readonly writer: BoardWriteRunner) {}

  /** Appends a column after the board's last one. */
  addColumn({
    boardId,
    column,
    ...write
  }: NewColumn): Promise<BoardWriteResult<BoardColumn>> {
    return this.write({ boardId, ...write }, async (manager) =>
      manager.save(
        manager.create(BoardColumn, {
          ...column,
          boardId,
          position: await this.positionAfter(manager, BoardColumn, {
            scope: { boardId },
            after: 'last',
          }),
        }),
      ),
    );
  }

  /** Appends a card after the column's last one; `not_found` if the column isn't on the board. */
  addCard({
    boardId,
    columnId,
    card,
    ...write
  }: NewCard): Promise<BoardWriteResult<Card>> {
    return this.write({ boardId, ...write }, async (manager) => {
      if (!(await manager.existsBy(BoardColumn, { id: columnId, boardId }))) {
        return null;
      }
      return manager.save(
        manager.create(Card, {
          ...card,
          boardId,
          columnId,
          position: await this.positionAfter(manager, Card, {
            scope: { columnId },
            after: 'last',
          }),
        }),
      );
    });
  }

  updateColumn({
    boardId,
    columnId,
    changes,
    ...write
  }: ColumnUpdate): Promise<BoardWriteResult<BoardColumn>> {
    return this.write({ boardId, ...write }, async (manager) => {
      const column = await manager.findOneBy(BoardColumn, {
        id: columnId,
        boardId,
      });
      if (!column) return null;
      return manager.save(Object.assign(column, changes));
    });
  }

  /** Places the column right after `afterColumnId` (or first). */
  moveColumn({
    boardId,
    columnId,
    afterColumnId,
    ...write
  }: ColumnMove): Promise<BoardWriteResult<BoardColumn>> {
    return this.write({ boardId, ...write }, async (manager) => {
      const column = await manager.findOneBy(BoardColumn, {
        id: columnId,
        boardId,
      });
      if (!column || afterColumnId === columnId) return null;

      let after: string | null = null;
      if (afterColumnId) {
        const neighbour = await manager.findOneBy(BoardColumn, {
          id: afterColumnId,
          boardId,
        });
        if (!neighbour) return null;
        after = neighbour.position;
      }

      column.position = await this.positionAfter(manager, BoardColumn, {
        scope: { boardId },
        after,
        excludeId: columnId,
      });
      return manager.save(column);
    });
  }

  /** Deletes the column; its cards go with it (FK cascade). Returns the deleted column. */
  deleteColumn({
    boardId,
    columnId,
    ...write
  }: ColumnRemoval): Promise<BoardWriteResult<BoardColumn>> {
    return this.write({ boardId, ...write }, async (manager) => {
      const column = await manager.findOneBy(BoardColumn, {
        id: columnId,
        boardId,
      });
      if (!column) return null;
      await manager.delete(BoardColumn, { id: columnId });
      return column;
    });
  }

  updateCard({
    boardId,
    cardId,
    changes,
    ...write
  }: CardUpdate): Promise<BoardWriteResult<Card>> {
    return this.write({ boardId, ...write }, async (manager) => {
      const card = await manager.findOneBy(Card, { id: cardId, boardId });
      if (!card) return null;
      return manager.save(Object.assign(card, changes));
    });
  }

  /** Places the card in `columnId` right after `afterCardId` (or first). */
  moveCard({
    boardId,
    cardId,
    columnId,
    afterCardId,
    ...write
  }: CardMove): Promise<BoardWriteResult<MovedCard>> {
    return this.write({ boardId, ...write }, async (manager) => {
      const card = await manager.findOneBy(Card, { id: cardId, boardId });
      if (!card || afterCardId === cardId) return null;
      if (!(await manager.existsBy(BoardColumn, { id: columnId, boardId }))) {
        return null;
      }

      let after: string | null = null;
      if (afterCardId) {
        const neighbour = await manager.findOneBy(Card, {
          id: afterCardId,
          columnId,
        });
        if (!neighbour) return null;
        after = neighbour.position;
      }

      const fromColumnId = card.columnId;
      card.position = await this.positionAfter(manager, Card, {
        scope: { columnId },
        after,
        excludeId: cardId,
      });
      card.columnId = columnId;
      return { card: await manager.save(card), fromColumnId };
    });
  }

  /** Deletes the card; returns it. */
  deleteCard({
    boardId,
    cardId,
    ...write
  }: CardRemoval): Promise<BoardWriteResult<Card>> {
    return this.write({ boardId, ...write }, async (manager) => {
      const card = await manager.findOneBy(Card, { id: cardId, boardId });
      if (!card) return null;
      await manager.delete(Card, { id: cardId });
      return card;
    });
  }

  /**
   * A position key right after `after` within `scope` (null = before all, 'last' = after all),
   * between it and the next item. `excludeId` skips the item being moved.
   */
  private async positionAfter(
    manager: EntityManager,
    entity: typeof BoardColumn | typeof Card,
    {
      scope,
      after,
      excludeId,
    }: {
      scope: { boardId: string } | { columnId: string };
      after: string | null | 'last';
      excludeId?: string;
    },
  ): Promise<string> {
    const [scopeField, scopeValue] = Object.entries(scope)[0];
    const query = manager
      .createQueryBuilder(entity, 'item')
      .select('item.position', 'position')
      .where(`item.${scopeField} = :scopeValue`, { scopeValue });
    if (excludeId) query.andWhere('item.id != :excludeId', { excludeId });

    if (after === 'last') {
      const last = await query
        .orderBy('item.position', 'DESC')
        .limit(1)
        .getRawOne<{ position: string }>();
      return positionBetween(last?.position ?? null, null);
    }

    if (after !== null) query.andWhere('item.position > :after', { after });
    const next = await query
      .orderBy('item.position', 'ASC')
      .limit(1)
      .getRawOne<{ position: string }>();
    return positionBetween(after, next?.position ?? null);
  }

  /** Runs `change` (null = target not found) in the board write transaction (`BoardWriteRunner`). */
  private write<T>(
    write: BoardWrite<T>,
    change: (manager: EntityManager) => Promise<T | null>,
  ): Promise<BoardWriteResult<T>> {
    return this.writer.run(write, async (manager) =>
      found(await change(manager)),
    );
  }
}
