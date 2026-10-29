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
