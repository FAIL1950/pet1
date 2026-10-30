import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';

/** What the sender needs about one email. */
export interface Delivery {
  id: string;
  kind: string;
  recipient: string;
  /** Send attempts made so far. */
  attempts: number;
  payload: Record<string, string>;
}

export interface NewDelivery {
  /** `eventId` of the event that asked for the email (dedupes redelivered events). */
  sourceEventId: string;
  kind: string;
  recipient: string;
  payload: Record<string, string>;
}

interface DeliveryRow {
  id: string;
  kind: string;
  recipient: string;
  attempts: number;
  payload: Record<string, string>;
}

const RETURNING = 'RETURNING id, kind, recipient, attempts, payload';

function toDelivery(row: DeliveryRow): Delivery {
  return { ...row, attempts: Number(row.attempts) };
}

/**
 * `email_deliveries`: one row per (event, kind). The row both dedupes redelivered Kafka events
 * and drives retries: a PENDING row is (re)sent once `next_attempt_at` has passed. Sending holds
 * no lock — rows are leased by pushing `next_attempt_at` forward, so several replicas never send
 * the same row at once and a crashed sender's row comes back after the lease.
 */
@Injectable()
export class EmailDeliveriesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Records a new delivery leased to the caller for `leaseMs`; null if this event was already
   * recorded (a redelivery), in which case nothing must be sent.
   */
  async claim(
    delivery: NewDelivery,
    leaseMs: number,
  ): Promise<Delivery | null> {
    const rows = await this.returning(
      `INSERT INTO email_deliveries (source_event_id, kind, recipient, payload, next_attempt_at)
       VALUES ($1, $2, $3, $4, now() + make_interval(secs => $5))
       ON CONFLICT (source_event_id, kind) DO NOTHING
       ${RETURNING}`,
      [
        delivery.sourceEventId,
        delivery.kind,
        delivery.recipient,
        JSON.stringify(delivery.payload),
        leaseMs / 1000,
      ],
    );
    return rows[0] ? toDelivery(rows[0]) : null;
  }

  /** Leases up to `limit` due PENDING rows (oldest first), skipping rows other replicas hold. */
  async leaseDue(limit: number, leaseMs: number): Promise<Delivery[]> {
    const rows = await this.returning(
      `UPDATE email_deliveries
       SET next_attempt_at = now() + make_interval(secs => $2)
       WHERE id IN (
         SELECT id FROM email_deliveries
         WHERE status = 'PENDING' AND next_attempt_at <= now()
         ORDER BY next_attempt_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       ${RETURNING}`,
      [limit, leaseMs / 1000],
    );
    return rows.map(toDelivery);
  }

  /**
   * Runs a `… RETURNING` statement and returns its rows. `DataSource.query` returns
   * `[rows, affected]` for UPDATE but plain rows for INSERT; the structured result is uniform.
   */
  private async returning(
    sql: string,
    params: unknown[],
  ): Promise<DeliveryRow[]> {
    const runner = this.dataSource.createQueryRunner();
    try {
      const { records } = await runner.query(sql, params, true);
      return records as DeliveryRow[];
    } finally {
      await runner.release();
    }
  }

  /** Sent: the payload (with the link's token) is dropped. */
  async markSent(id: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE email_deliveries
       SET status = 'SENT', sent_at = now(), attempts = attempts + 1,
           last_error = NULL, next_attempt_at = NULL, payload = '{}'
       WHERE id = $1`,
      [id],
    );
  }

  async scheduleRetry(
    id: string,
    error: string,
    nextAttemptAt: Date,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE email_deliveries
       SET attempts = attempts + 1, last_error = $2, next_attempt_at = $3
       WHERE id = $1`,
      [id, error, nextAttemptAt],
    );
  }

  /** Gave up: kept for inspection, without the payload. */
  async markFailed(id: string, error: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE email_deliveries
       SET status = 'FAILED', attempts = attempts + 1, last_error = $2,
           next_attempt_at = NULL, payload = '{}'
       WHERE id = $1`,
      [id, error],
    );
  }
}
