import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toOutboxMessage, type AuthUser } from '@app/common';
import {
  BOARD_CREATED,
  BOARD_EVENTS_TOPIC,
  CARD_CREATED,
  COLUMN_CREATED,
  type BoardCreatedEvent,
  type CardCreatedEvent,
  type ColumnCreatedEvent,
} from '@app/contracts';
import { randomUUID } from 'node:crypto';
import type { BoardColumn } from '../database/entities/board-column.entity.js';
import { BoardRole } from '../database/entities/board-member.entity.js';
import type { Board } from '../database/entities/board.entity.js';
import type { Card } from '../database/entities/card.entity.js';
import {
  BoardContentRepository,
  type BoardWriteResult,
} from '../database/repositories/board-content.repository.js';
import { BoardsRepository } from '../database/repositories/boards.repository.js';
import type { CreateCardInput } from './create-card.schema.js';
import type { CreateColumnInput } from './create-column.schema.js';
import type { CreateBoardInput } from './create-board.schema.js';

export function toBoardCreatedEvent(
  boardId: string,
  user: AuthUser,
  input: CreateBoardInput,
): BoardCreatedEvent {
  return {
    eventId: randomUUID(),
    eventType: BOARD_CREATED,
    aggregateId: boardId,
    aggregateType: 'Board',
    version: 1,
    timestamp: new Date().toISOString(),
    payload: {
      boardId,
      title: input.title,
      description: input.description,
      owner: {
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    },
  };
}

export function toColumnCreatedEvent(
  column: BoardColumn,
  version: number,
): ColumnCreatedEvent {
  return {
    eventId: randomUUID(),
    eventType: COLUMN_CREATED,
    aggregateId: column.boardId,
    aggregateType: 'Board',
    version,
    timestamp: new Date().toISOString(),
    payload: {
      boardId: column.boardId,
      columnId: column.id,
      title: column.title,
      position: column.position,
    },
  };
}

export function toCardCreatedEvent(
  card: Card,
  version: number,
): CardCreatedEvent {
  return {
    eventId: randomUUID(),
    eventType: CARD_CREATED,
    aggregateId: card.boardId,
    aggregateType: 'Board',
    version,
    timestamp: new Date().toISOString(),
    payload: {
      boardId: card.boardId,
      columnId: card.columnId,
      cardId: card.id,
      title: card.title,
      description: card.description,
      position: card.position,
      createdBy: card.createdBy,
    },
  };
}

/** Roles that may change columns and cards (SPEC §12). */
export const CONTENT_EDITOR_ROLES = [
  BoardRole.OWNER,
  BoardRole.EDITOR,
] as const;

function unwrap<T>(result: BoardWriteResult<T>): T {
  if (result.status === 'forbidden') {
    throw new ForbiddenException('Insufficient board role');
  }
  if (result.status === 'not_found') throw new NotFoundException();
  return result.value;
}

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
      events: [toOutboxMessage(BOARD_EVENTS_TOPIC, event)],
    });
  }

  async createColumn(
    user: AuthUser,
    boardId: string,
    input: CreateColumnInput,
  ): Promise<BoardColumn> {
    const result = await this.content.addColumn({
      boardId,
      userId: user.id,
      allowedRoles: CONTENT_EDITOR_ROLES,
      column: { id: randomUUID(), title: input.title },
      toEvents: (column, version) => [
        toOutboxMessage(
          BOARD_EVENTS_TOPIC,
          toColumnCreatedEvent(column, version),
        ),
      ],
    });
    return unwrap(result);
  }

  async createCard(
    user: AuthUser,
    boardId: string,
    columnId: string,
    input: CreateCardInput,
  ): Promise<Card> {
    const result = await this.content.addCard({
      boardId,
      columnId,
      userId: user.id,
      allowedRoles: CONTENT_EDITOR_ROLES,
      card: {
        id: randomUUID(),
        title: input.title,
        description: input.description,
        createdBy: user.id,
      },
      toEvents: (card, version) => [
        toOutboxMessage(BOARD_EVENTS_TOPIC, toCardCreatedEvent(card, version)),
      ],
    });
    return unwrap(result);
  }
}
