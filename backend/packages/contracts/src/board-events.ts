import type { DomainEvent } from './domain-event.js';

export const BOARD_CREATED = 'BoardCreated';

/** Snapshot of the creating user, as seen by the boards service at command time. */
export interface BoardOwnerSnapshot {
  userId: string;
  email: string;
  name: string;
  image: string | null;
}

export interface BoardCreatedPayload {
  boardId: string;
  title: string;
  description: string | null;
  /**
   * Lets the projection insert the owner's `users` row even if `UserRegistered` hasn't been
   * consumed yet or has already aged out of `auth.events` (retention).
   */
  owner: BoardOwnerSnapshot;
}

/** Published to `board.events` (key = boardId); the creator becomes the board's OWNER. */
export type BoardCreatedEvent = DomainEvent<BoardCreatedPayload> & {
  eventType: typeof BOARD_CREATED;
  aggregateType: 'Board';
};

export const COLUMN_CREATED = 'ColumnCreated';

export interface ColumnCreatedPayload {
  boardId: string;
  columnId: string;
  title: string;
  /** Fractional-index key; columns sort by it. */
  position: string;
}

/** Published to `board.events` (key = boardId); `version` is the board's new version. */
export type ColumnCreatedEvent = DomainEvent<ColumnCreatedPayload> & {
  eventType: typeof COLUMN_CREATED;
  aggregateType: 'Board';
};

export const CARD_CREATED = 'CardCreated';

export interface CardCreatedPayload {
  boardId: string;
  columnId: string;
  cardId: string;
  title: string;
  description: string | null;
  /** Fractional-index key within the column. */
  position: string;
  /** User id of the creator. */
  createdBy: string | null;
}

/** Published to `board.events` (key = boardId); `version` is the board's new version. */
export type CardCreatedEvent = DomainEvent<CardCreatedPayload> & {
  eventType: typeof CARD_CREATED;
  aggregateType: 'Board';
};
