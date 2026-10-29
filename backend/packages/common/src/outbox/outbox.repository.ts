import { Inject, Injectable } from '@nestjs/common';
import {
  OUTBOX_STORE,
  type OutboxMessage,
  type OutboxStore,
} from './outbox.js';

// Only one relay per database at a time (across replicas), so per-key order survives scaling out.
const LOCK_SQL = `SELECT pg_try_advisory_xact_lock(hashtext('outbox-relay')) AS locked`;
const SELECT_SQL = `SELECT id, topic, "key", event_type, event FROM outbox ORDER BY created_at, id LIMIT $1`;
const DELETE_SQL = `DELETE FROM outbox WHERE id = ANY($1)`;

interface OutboxRow {
  id: string;
  topic: string;
  key: string;
  event_type: string;
  event: string;
}

/** Reads and removes rows of the service's `outbox` table for `OutboxRelay`. */
@Injectable()
export class OutboxRepository {
  constructor(@Inject(OUTBOX_STORE) private readonly store: OutboxStore) {}

  /**
   * In one transaction: takes the relay lock, reads up to `limit` rows in `created_at` order,
   * hands them to `publish` and deletes them. If `publish` throws, the rows stay. Returns the
   * number of processed rows (0 when another relay holds the lock).
   */
  async processBatch(
    limit: number,
    publish: (messages: OutboxMessage[]) => Promise<void>,
  ): Promise<number> {
    return this.store.withTransaction(async (query) => {
      const [{ locked }] = await query(LOCK_SQL);
      if (!locked) return 0;

      const rows = (await query(SELECT_SQL, [limit])) as unknown as OutboxRow[];
      if (rows.length === 0) return 0;

      await publish(
        rows.map(({ event_type, ...row }) => ({
          ...row,
          eventType: event_type,
        })),
      );
      await query(DELETE_SQL, [rows.map((row) => row.id)]);
      return rows.length;
    });
  }
}
