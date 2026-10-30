import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import { EmailDeliveriesRepository } from '../database/repositories/email-deliveries.repository.js';
import { DELIVERY_LEASE_MS, DeliveryService } from './delivery.service.js';

export const RETRY_POLL_INTERVAL_MS = 30_000;
export const RETRY_BATCH_SIZE = 10;

/**
 * Resends deliveries whose `next_attempt_at` has passed: failed sends and ones whose sender
 * crashed. Runs in every replica; leasing (`leaseDue`, SKIP LOCKED) keeps them from sending the
 * same row twice.
 */
@Injectable()
export class RetryWorker
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly logger = new Logger(RetryWorker.name);
  private readonly stopped = new AbortController();
  private loop: Promise<void> | null = null;

  constructor(
    private readonly deliveries: EmailDeliveriesRepository,
    private readonly delivery: DeliveryService,
  ) {}

  onApplicationBootstrap() {
    this.loop = this.run();
  }

  async beforeApplicationShutdown() {
    this.stopped.abort();
    await this.loop;
  }

  /** Sends one batch of due deliveries; returns how many were attempted. */
  async retryDue(): Promise<number> {
    const due = await this.deliveries.leaseDue(
      RETRY_BATCH_SIZE,
      DELIVERY_LEASE_MS,
    );
    for (const row of due) await this.delivery.deliver(row);
    return due.length;
  }

  private async run() {
    while (!this.stopped.signal.aborted) {
      try {
        // A full batch may mean more are due: go again right away.
        if ((await this.retryDue()) === RETRY_BATCH_SIZE) continue;
      } catch (error) {
        this.logger.error(
          'Retrying email deliveries failed',
          error instanceof Error ? error.stack : String(error),
        );
      }
      try {
        await sleep(RETRY_POLL_INTERVAL_MS, undefined, {
          signal: this.stopped.signal,
        });
      } catch {
        // Aborted by shutdown.
      }
    }
  }
}
