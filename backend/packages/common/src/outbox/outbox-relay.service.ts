import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  KafkaProducerService,
  type KafkaTopicMessages,
} from '../kafka/kafka-producer.service.js';
import { OUTBOX_STORE, type OutboxStore } from './outbox.js';

export const OUTBOX_BATCH_SIZE = 100;
export const OUTBOX_IDLE_DELAY_MS = 250;
export const OUTBOX_MIN_BACKOFF_MS = 1000;
export const OUTBOX_MAX_BACKOFF_MS = 30_000;

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

/** Groups rows into per-topic batches, keeping their order. */
function toTopicMessages(rows: OutboxRow[]): KafkaTopicMessages[] {
  const batches: KafkaTopicMessages[] = [];
  for (const row of rows) {
    const message = {
      key: row.key,
      value: row.event,
      headers: { eventType: row.event_type },
    };
    const last = batches.at(-1);
    if (last?.topic === row.topic) last.messages.push(message);
    else batches.push({ topic: row.topic, messages: [message] });
  }
  return batches;
}

/**
 * Polls the service's `outbox` table and publishes its rows to Kafka in `created_at` order,
 * deleting them in the same transaction. Delivery is at least once: a crash between the
 * Kafka send and the commit publishes the rows again, so consumers must stay idempotent.
 */
@Injectable()
export class OutboxRelay
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly logger = new Logger(OutboxRelay.name);
  private readonly stopped = new AbortController();
  private loop: Promise<void> | null = null;

  constructor(
    @Inject(OUTBOX_STORE) private readonly store: OutboxStore,
    private readonly kafka: KafkaProducerService,
  ) {}

  onApplicationBootstrap() {
    this.loop = this.run();
  }

  // Before the Kafka producer disconnects (onApplicationShutdown): finish the current batch first.
  async beforeApplicationShutdown() {
    this.stopped.abort();
    await this.loop;
  }

  /** Publishes one batch; returns how many rows were published (0 if another relay holds the lock). */
  async relayBatch(): Promise<number> {
    return this.store.withTransaction(async (query) => {
      const [{ locked }] = await query(LOCK_SQL);
      if (!locked) return 0;

      const rows = (await query(SELECT_SQL, [
        OUTBOX_BATCH_SIZE,
      ])) as unknown as OutboxRow[];
      if (rows.length === 0) return 0;

      await this.kafka.sendBatch(toTopicMessages(rows));
      await query(DELETE_SQL, [rows.map((row) => row.id)]);
      return rows.length;
    });
  }

  private async run() {
    let backoff = OUTBOX_MIN_BACKOFF_MS;
    while (!this.stopped.signal.aborted) {
      try {
        const published = await this.relayBatch();
        backoff = OUTBOX_MIN_BACKOFF_MS;
        if (published < OUTBOX_BATCH_SIZE)
          await this.pause(OUTBOX_IDLE_DELAY_MS);
      } catch (error) {
        this.logger.error(
          `Outbox relay failed, retrying in ${backoff} ms`,
          error instanceof Error ? error.stack : String(error),
        );
        await this.pause(backoff);
        backoff = Math.min(backoff * 2, OUTBOX_MAX_BACKOFF_MS);
      }
    }
  }

  /** Sleeps, but wakes up immediately on shutdown. */
  private async pause(ms: number) {
    try {
      await sleep(ms, undefined, { signal: this.stopped.signal });
    } catch {
      // Aborted by shutdown.
    }
  }
}
