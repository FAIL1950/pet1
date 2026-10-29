import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { OutboxMessage } from '@app/common';
import type { DataSource, EntityManager } from 'typeorm';
import { BoardColumn } from '../entities/board-column.entity.js';
import { BoardMember, BoardRole } from '../entities/board-member.entity.js';
import { Board } from '../entities/board.entity.js';
import { Card } from '../entities/card.entity.js';
import { positionBetween } from '../position.js';
import { OutboxMessagesRepository } from './outbox-messages.repository.js';

/** Outcome of a board write: access is checked under the board's row lock. */
export type BoardWriteResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'forbidden' }
  | { status: 'not_found' };

interface BoardWrite<T> {
  boardId: string;
  userId: string;
  /** Roles that may perform the write; other members get `forbidden`, non-members `not_found`. */
  allowedRoles: readonly BoardRole[];
  /** Builds the events from the saved entity and the board's new version. */
  toEvents: (saved: T, version: number) => OutboxMessage[];
}

export interface NewColumn extends BoardWrite<BoardColumn> {
  column: Pick<BoardColumn, 'id' | 'title'>;
}

export interface NewCard extends BoardWrite<Card> {
  columnId: string;
  card: Pick<Card, 'id' | 'title' | 'description' | 'createdBy'>;
}

/**
 * Columns and cards. Each write is one transaction: lock the board row (serializes writes to
 * one board), check the caller's role, append the item at the end, bump `boards.version` and
 * store the events in the outbox.
 */
@Injectable()
export class BoardContentRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly outbox: OutboxMessagesRepository,
  ) {}

  /** Appends a column after the board's last one. */
  addColumn({
    boardId,
    column,
    ...write
  }: NewColumn): Promise<BoardWriteResult<BoardColumn>> {
    return this.write({ boardId, ...write }, async (manager) => {
      const last = await manager.findOne(BoardColumn, {
        where: { boardId },
        order: { position: 'DESC' },
      });
      return manager.save(
        manager.create(BoardColumn, {
          ...column,
          boardId,
          position: positionBetween(last?.position ?? null, null),
        }),
      );
    });
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
      const last = await manager.findOne(Card, {
        where: { columnId },
        order: { position: 'DESC' },
      });
      return manager.save(
        manager.create(Card, {
          ...card,
          boardId,
          columnId,
          position: positionBetween(last?.position ?? null, null),
        }),
      );
    });
  }

  /** Runs `insert` (null = target not found) inside the locked, access-checked transaction. */
  private write<T>(
    { boardId, userId, allowedRoles, toEvents }: BoardWrite<T>,
    insert: (manager: EntityManager) => Promise<T | null>,
  ): Promise<BoardWriteResult<T>> {
    return this.dataSource.transaction(async (manager) => {
      const access = await manager
        .createQueryBuilder(Board, 'board')
        .innerJoin(
          BoardMember,
          'member',
          'member.boardId = board.id AND member.userId = :userId',
          { userId },
        )
        .select('board.version', 'version')
        .addSelect('member.role', 'role')
        .where('board.id = :boardId', { boardId })
        .setLock('pessimistic_write', undefined, ['board'])
        .getRawOne<{ version: number; role: BoardRole }>();
      if (!access) return { status: 'not_found' };
      if (!allowedRoles.includes(access.role)) return { status: 'forbidden' };

      const saved = await insert(manager);
      if (saved === null) return { status: 'not_found' };

      const version = access.version + 1;
      await manager.update(Board, { id: boardId }, { version });
      await this.outbox.add(toEvents(saved, version), manager);
      return { status: 'ok', value: saved };
    });
  }
}
