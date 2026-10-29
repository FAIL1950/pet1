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

/**
 * A change inside a board, published to `board.events` (key = boardId); `version` is the
 * board's new version.
 */
type BoardContentEvent<
  TType extends string,
  TPayload,
> = DomainEvent<TPayload> & {
  eventType: TType;
  aggregateType: 'Board';
};

export const COLUMN_UPDATED = 'ColumnUpdated';
export type ColumnUpdatedEvent = BoardContentEvent<
  typeof COLUMN_UPDATED,
  { boardId: string; columnId: string; title: string }
>;

export const COLUMN_MOVED = 'ColumnMoved';
export type ColumnMovedEvent = BoardContentEvent<
  typeof COLUMN_MOVED,
  { boardId: string; columnId: string; position: string }
>;

/** The column's cards are deleted with it; no separate CardDeleted events. */
export const COLUMN_DELETED = 'ColumnDeleted';
export type ColumnDeletedEvent = BoardContentEvent<
  typeof COLUMN_DELETED,
  { boardId: string; columnId: string }
>;

export const CARD_UPDATED = 'CardUpdated';
export type CardUpdatedEvent = BoardContentEvent<
  typeof CARD_UPDATED,
  {
    boardId: string;
    cardId: string;
    title: string;
    description: string | null;
  }
>;

export const CARD_MOVED = 'CardMoved';
export type CardMovedEvent = BoardContentEvent<
  typeof CARD_MOVED,
  {
    boardId: string;
    cardId: string;
    fromColumnId: string;
    toColumnId: string;
    position: string;
  }
>;

export const CARD_DELETED = 'CardDeleted';
export type CardDeletedEvent = BoardContentEvent<
  typeof CARD_DELETED,
  { boardId: string; cardId: string; columnId: string }
>;

/** Role names as stored in `board_members.role`. */
export type BoardMemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export const BOARD_MEMBER_ADDED = 'BoardMemberAdded';
export type BoardMemberAddedEvent = BoardContentEvent<
  typeof BOARD_MEMBER_ADDED,
  { boardId: string; userId: string; role: BoardMemberRole }
>;

export const BOARD_MEMBER_ROLE_CHANGED = 'BoardMemberRoleChanged';
export type BoardMemberRoleChangedEvent = BoardContentEvent<
  typeof BOARD_MEMBER_ROLE_CHANGED,
  { boardId: string; userId: string; role: BoardMemberRole }
>;

/** Removed by the OWNER, or the member left the board. */
export const BOARD_MEMBER_REMOVED = 'BoardMemberRemoved';
export type BoardMemberRemovedEvent = BoardContentEvent<
  typeof BOARD_MEMBER_REMOVED,
  { boardId: string; userId: string }
>;
