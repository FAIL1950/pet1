import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  KafkaProducerService,
  type KafkaTopicMessages,
} from '../kafka/kafka-producer.service.js';
import type { OutboxMessage } from './outbox.js';
import { OutboxRepository } from './outbox.repository.js';

export const OUTBOX_BATCH_SIZE = 100;
export const OUTBOX_IDLE_DELAY_MS = 250;
export const OUTBOX_MIN_BACKOFF_MS = 1000;
export const OUTBOX_MAX_BACKOFF_MS = 30_000;

/** Groups messages into per-topic batches, keeping their order. */
function toTopicMessages(messages: OutboxMessage[]): KafkaTopicMessages[] {
  const batches: KafkaTopicMessages[] = [];
  for (const { topic, key, eventType, event } of messages) {
    const message = { key, value: event, headers: { eventType } };
    const last = batches.at(-1);
    if (last?.topic === topic) last.messages.push(message);
    else batches.push({ topic, messages: [message] });
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
    private readonly outbox: OutboxRepository,
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
  relayBatch(): Promise<number> {
    return this.outbox.processBatch(OUTBOX_BATCH_SIZE, (messages) =>
      this.kafka.sendBatch(toTopicMessages(messages)),
    );
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
