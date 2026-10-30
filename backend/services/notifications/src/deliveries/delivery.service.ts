import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EmailDeliveriesRepository,
  type Delivery,
  type NewDelivery,
} from '../database/repositories/email-deliveries.repository.js';
import {
  EMAIL_SENDER,
  type EmailSender,
  type SendEmailInput,
} from '../email/email-sender.js';
import {
  renderVerifyEmail,
  VERIFY_EMAIL_KIND,
} from '../email/templates/verify-email.js';

/** Pause before the 1st, 2nd, … retry; after the last one the delivery is FAILED. */
export const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  3 * 60 * 60_000,
];

/** How long a claimed delivery belongs to its sender before the retry worker may take it. */
export const DELIVERY_LEASE_MS = 5 * 60_000;

function render(delivery: Delivery): SendEmailInput {
  switch (delivery.kind) {
    case VERIFY_EMAIL_KIND:
      return renderVerifyEmail(delivery.recipient, {
        name: delivery.payload.name ?? '',
        url: delivery.payload.url ?? '',
      });
    default:
      throw new Error(`Unknown email kind: ${delivery.kind}`);
  }
}

/**
 * Sends emails and records the outcome: SENT, a retry with growing pauses, or FAILED after
 * `RETRY_DELAYS_MS.length` retries. Never throws for a send failure — the retry is the handling.
 * Errors are logged without the payload (verification links carry tokens).
 */
@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly deliveries: EmailDeliveriesRepository,
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
  ) {}

  /** Records the email for an event and sends it; a redelivered event sends nothing. */
  async request(delivery: NewDelivery): Promise<void> {
    const claimed = await this.deliveries.claim(delivery, DELIVERY_LEASE_MS);
    if (!claimed) {
      this.logger.debug(
        `Skipping ${delivery.kind} for event ${delivery.sourceEventId}: already handled`,
      );
      return;
    }
    await this.deliver(claimed);
  }

  async deliver(delivery: Delivery): Promise<void> {
    try {
      await this.sender.send(render(delivery));
      await this.deliveries.markSent(delivery.id);
      this.logger.log(`Sent ${delivery.kind} email (delivery ${delivery.id})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // `attempts` counts earlier tries; this failed one is number attempts + 1.
      const retry = delivery.attempts;
      if (retry >= RETRY_DELAYS_MS.length) {
        await this.deliveries.markFailed(delivery.id, message);
        this.logger.error(
          `Giving up on ${delivery.kind} email (delivery ${delivery.id}) after ${retry + 1} attempts: ${message}`,
        );
        return;
      }
      const delay = RETRY_DELAYS_MS[retry];
      await this.deliveries.scheduleRetry(
        delivery.id,
        message,
        new Date(Date.now() + delay),
      );
      this.logger.warn(
        `Sending ${delivery.kind} email (delivery ${delivery.id}) failed, retry in ${delay / 1000}s: ${message}`,
      );
    }
  }
}
