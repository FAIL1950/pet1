import type { OutboxStore } from '@app/common';
import type { Pool } from 'pg';

/** `OutboxRelay` store over the pg pool Better Auth uses. */
export function pgOutboxStore(pool: Pool): OutboxStore {
  return {
    async withTransaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(async (sql, params) => {
          const { rows } = await client.query(sql, params);
          return rows as Record<string, unknown>[];
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
