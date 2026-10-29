import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@app/common';
import { randomUUID } from 'node:crypto';
import type { BoardColumn } from '../database/entities/board-column.entity.js';
import { BoardRole } from '../database/entities/board-member.entity.js';
import type { Board } from '../database/entities/board.entity.js';
import type { Card } from '../database/entities/card.entity.js';
import { BoardContentRepository } from '../database/repositories/board-content.repository.js';
import { BoardsRepository } from '../database/repositories/boards.repository.js';
import {
  boardOutboxMessage,
  emit,
  toBoardCreatedEvent,
  toCardCreatedEvent,
  toCardDeletedEvent,
  toCardMovedEvent,
  toCardUpdatedEvent,
  toColumnCreatedEvent,
  toColumnDeletedEvent,
  toColumnMovedEvent,
  toColumnUpdatedEvent,
} from './board-events.js';
import type { CreateBoardInput } from './create-board.schema.js';
import type { CreateCardInput } from './create-card.schema.js';
import type { CreateColumnInput } from './create-column.schema.js';
import { unwrapBoardWrite as unwrap } from './board-write-result.js';
import type { MoveCardInput, MoveColumnInput } from './move.schema.js';

/** Roles that may change columns and cards (SPEC §12). */
export const CONTENT_EDITOR_ROLES = [
  BoardRole.OWNER,
  BoardRole.EDITOR,
] as const;

/**
 * Board commands: Postgres is the source of truth. Each command persists its change together
 * with its event through a repository (one transaction with the outbox); `OutboxRelay`
 * publishes the event to `board.events`.
 */
@Injectable()
export class BoardCommandsService {
  constructor(
    private readonly boards: BoardsRepository,
    private readonly content: BoardContentRepository,
  ) {}

  async createBoard(user: AuthUser, input: CreateBoardInput): Promise<Board> {
    const boardId = randomUUID();
    const event = toBoardCreatedEvent(boardId, user, input);

    return this.boards.createWithOwner({
      board: {
        id: boardId,
        title: input.title,
        description: input.description,
        version: event.version,
      },
      // The JWT claims fill a missing `users` row; UserRegistered stays authoritative.
      owner: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      events: [boardOutboxMessage(event)],
    });
  }

  /** Fields every content write shares: the board, the caller and who may write. */
  private access(user: AuthUser, boardId: string) {
    return {
      boardId,
      userId: user.id,
      allowedRoles: CONTENT_EDITOR_ROLES,
    };
  }

  async createColumn(
    user: AuthUser,
    boardId: string,
    input: CreateColumnInput,
  ): Promise<BoardColumn> {
    return unwrap(
      await this.content.addColumn({
        ...this.access(user, boardId),
        column: { id: randomUUID(), title: input.title },
        toEvents: emit(toColumnCreatedEvent),
      }),
    );
  }

  async updateColumn(
    user: AuthUser,
    boardId: string,
    columnId: string,
    input: CreateColumnInput,
  ): Promise<BoardColumn> {
    return unwrap(
      await this.content.updateColumn({
        ...this.access(user, boardId),
        columnId,
        changes: { title: input.title },
        toEvents: emit(toColumnUpdatedEvent),
      }),
    );
  }

  async moveColumn(
    user: AuthUser,
    boardId: string,
    columnId: string,
    input: MoveColumnInput,
  ): Promise<BoardColumn> {
    return unwrap(
      await this.content.moveColumn({
        ...this.access(user, boardId),
        columnId,
        afterColumnId: input.afterColumnId,
        toEvents: emit(toColumnMovedEvent),
      }),
    );
  }

  async deleteColumn(
    user: AuthUser,
    boardId: string,
    columnId: string,
  ): Promise<void> {
    unwrap(
      await this.content.deleteColumn({
        ...this.access(user, boardId),
        columnId,
        toEvents: emit(toColumnDeletedEvent),
      }),
    );
  }

  async createCard(
    user: AuthUser,
    boardId: string,
    columnId: string,
    input: CreateCardInput,
  ): Promise<Card> {
    return unwrap(
      await this.content.addCard({
        ...this.access(user, boardId),
        columnId,
        card: {
          id: randomUUID(),
          title: input.title,
          description: input.description,
          createdBy: user.id,
        },
        toEvents: emit(toCardCreatedEvent),
      }),
    );
  }

  async updateCard(
    user: AuthUser,
    boardId: string,
    cardId: string,
    input: CreateCardInput,
  ): Promise<Card> {
    return unwrap(
      await this.content.updateCard({
        ...this.access(user, boardId),
        cardId,
        changes: { title: input.title, description: input.description },
        toEvents: emit(toCardUpdatedEvent),
      }),
    );
  }

  async moveCard(
    user: AuthUser,
    boardId: string,
    cardId: string,
    input: MoveCardInput,
  ): Promise<Card> {
    const { card } = unwrap(
      await this.content.moveCard({
        ...this.access(user, boardId),
        cardId,
        columnId: input.columnId,
        afterCardId: input.afterCardId,
        toEvents: emit(toCardMovedEvent),
      }),
    );
    return card;
  }

  async deleteCard(
    user: AuthUser,
    boardId: string,
    cardId: string,
  ): Promise<void> {
    unwrap(
      await this.content.deleteCard({
        ...this.access(user, boardId),
        cardId,
        toEvents: emit(toCardDeletedEvent),
      }),
    );
  }
}
