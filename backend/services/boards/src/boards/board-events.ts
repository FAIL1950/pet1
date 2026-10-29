import {
  toOutboxMessage,
  type AuthUser,
  type OutboxMessage,
} from '@app/common';
import {
  BOARD_CREATED,
  BOARD_MEMBER_ADDED,
  BOARD_MEMBER_REMOVED,
  BOARD_MEMBER_ROLE_CHANGED,
  BOARD_EVENTS_TOPIC,
  CARD_CREATED,
  CARD_DELETED,
  CARD_MOVED,
  CARD_UPDATED,
  COLUMN_CREATED,
  COLUMN_DELETED,
  COLUMN_MOVED,
  COLUMN_UPDATED,
  type BoardCreatedEvent,
  type BoardMemberAddedEvent,
  type BoardMemberRemovedEvent,
  type BoardMemberRoleChangedEvent,
  type CardCreatedEvent,
  type CardDeletedEvent,
  type CardMovedEvent,
  type CardUpdatedEvent,
  type ColumnCreatedEvent,
  type ColumnDeletedEvent,
  type ColumnMovedEvent,
  type ColumnUpdatedEvent,
  type DomainEvent,
} from '@app/contracts';
import { randomUUID } from 'node:crypto';
import type { BoardColumn } from '../database/entities/board-column.entity.js';
import type { Card } from '../database/entities/card.entity.js';
import type { BoardMember } from '../database/entities/board-member.entity.js';
import type { MovedCard } from '../database/repositories/board-content.repository.js';
import type { MemberProfile } from '../database/repositories/board-members.repository.js';
import type { CreateBoardInput } from './create-board.schema.js';

type BoardEvent = DomainEvent<unknown> & { aggregateType: 'Board' };

/** Envelope of a board event: aggregate = the board, keyed by its id. */
function boardEvent<E extends BoardEvent>(
  eventType: E['eventType'],
  boardId: string,
  version: number,
  payload: E['payload'],
): E {
  return {
    eventId: randomUUID(),
    eventType,
    aggregateId: boardId,
    aggregateType: 'Board',
    version,
    timestamp: new Date().toISOString(),
    payload,
  } as E;
}

/** The outbox row of a board event (topic `board.events`). */
export function boardOutboxMessage(event: BoardEvent): OutboxMessage {
  return toOutboxMessage(BOARD_EVENTS_TOPIC, event);
}

/** `toEvents` callback for a board repository write: one board event per write. */
export function emit<T>(
  toEvent: (written: T, version: number) => BoardEvent,
): (written: T, version: number) => OutboxMessage[] {
  return (written, version) => [boardOutboxMessage(toEvent(written, version))];
}

export function toBoardCreatedEvent(
  boardId: string,
  user: AuthUser,
  input: CreateBoardInput,
): BoardCreatedEvent {
  return boardEvent<BoardCreatedEvent>(BOARD_CREATED, boardId, 1, {
    boardId,
    title: input.title,
    description: input.description,
    owner: {
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  });
}

export function toColumnCreatedEvent(
  column: BoardColumn,
  version: number,
): ColumnCreatedEvent {
  return boardEvent<ColumnCreatedEvent>(
    COLUMN_CREATED,
    column.boardId,
    version,
    {
      boardId: column.boardId,
      columnId: column.id,
      title: column.title,
      position: column.position,
    },
  );
}

export function toColumnUpdatedEvent(
  column: BoardColumn,
  version: number,
): ColumnUpdatedEvent {
  return boardEvent<ColumnUpdatedEvent>(
    COLUMN_UPDATED,
    column.boardId,
    version,
    { boardId: column.boardId, columnId: column.id, title: column.title },
  );
}

export function toColumnMovedEvent(
  column: BoardColumn,
  version: number,
): ColumnMovedEvent {
  return boardEvent<ColumnMovedEvent>(COLUMN_MOVED, column.boardId, version, {
    boardId: column.boardId,
    columnId: column.id,
    position: column.position,
  });
}

export function toColumnDeletedEvent(
  column: BoardColumn,
  version: number,
): ColumnDeletedEvent {
  return boardEvent<ColumnDeletedEvent>(
    COLUMN_DELETED,
    column.boardId,
    version,
    { boardId: column.boardId, columnId: column.id },
  );
}

export function toCardCreatedEvent(
  card: Card,
  version: number,
): CardCreatedEvent {
  return boardEvent<CardCreatedEvent>(CARD_CREATED, card.boardId, version, {
    boardId: card.boardId,
    columnId: card.columnId,
    cardId: card.id,
    title: card.title,
    description: card.description,
    position: card.position,
    createdBy: card.createdBy,
  });
}

export function toCardUpdatedEvent(
  card: Card,
  version: number,
): CardUpdatedEvent {
  return boardEvent<CardUpdatedEvent>(CARD_UPDATED, card.boardId, version, {
    boardId: card.boardId,
    cardId: card.id,
    title: card.title,
    description: card.description,
  });
}

export function toCardMovedEvent(
  { card, fromColumnId }: MovedCard,
  version: number,
): CardMovedEvent {
  return boardEvent<CardMovedEvent>(CARD_MOVED, card.boardId, version, {
    boardId: card.boardId,
    cardId: card.id,
    fromColumnId,
    toColumnId: card.columnId,
    position: card.position,
  });
}

export function toCardDeletedEvent(
  card: Card,
  version: number,
): CardDeletedEvent {
  return boardEvent<CardDeletedEvent>(CARD_DELETED, card.boardId, version, {
    boardId: card.boardId,
    cardId: card.id,
    columnId: card.columnId,
  });
}

export function toBoardMemberAddedEvent(
  boardId: string,
  member: MemberProfile,
  version: number,
): BoardMemberAddedEvent {
  return boardEvent<BoardMemberAddedEvent>(
    BOARD_MEMBER_ADDED,
    boardId,
    version,
    { boardId, userId: member.userId, role: member.role },
  );
}

export function toBoardMemberRoleChangedEvent(
  boardId: string,
  member: MemberProfile,
  version: number,
): BoardMemberRoleChangedEvent {
  return boardEvent<BoardMemberRoleChangedEvent>(
    BOARD_MEMBER_ROLE_CHANGED,
    boardId,
    version,
    { boardId, userId: member.userId, role: member.role },
  );
}

export function toBoardMemberRemovedEvent(
  member: BoardMember,
  version: number,
): BoardMemberRemovedEvent {
  return boardEvent<BoardMemberRemovedEvent>(
    BOARD_MEMBER_REMOVED,
    member.boardId,
    version,
    { boardId: member.boardId, userId: member.userId },
  );
}
