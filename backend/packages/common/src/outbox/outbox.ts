import type { DomainEvent } from '@app/contracts';

/**
 * A row of a service's `outbox` table: an event written in the same transaction as the state
 * change it describes, delivered to Kafka later by `OutboxRelay`.
 *
 * Every service's table has the columns `id`, `topic`, `key`, `event_type`, `event` (the
 * serialized envelope) and `created_at` (delivery order).
 */
export interface OutboxMessage {
  id: string;
  topic: string;
  key: string;
  eventType: string;
  event: string;
}

export function toOutboxMessage<T>(
  topic: string,
  event: DomainEvent<T>,
): OutboxMessage {
  return {
    id: event.eventId,
    topic,
    // Same key as before the outbox: events of one aggregate stay ordered within a partition.
    key: event.aggregateId,
    eventType: event.eventType,
    event: JSON.stringify(event),
  };
}

export type OutboxQuery = (
  sql: string,
  params?: unknown[],
) => Promise<Record<string, unknown>[]>;

/** Runs `OutboxRepository` SQL in one transaction of the service's database (TypeORM, pg, ...). */
export interface OutboxStore {
  withTransaction<T>(work: (query: OutboxQuery) => Promise<T>): Promise<T>;
}

/** Provide with `{ provide: OUTBOX_STORE, useFactory: ... }` in each service module. */
export const OUTBOX_STORE = Symbol('OUTBOX_STORE');
