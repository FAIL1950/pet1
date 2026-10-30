import { toOutboxMessage } from '@app/common';
import {
  AUTH_EVENTS_TOPIC,
  EMAIL_VERIFICATION_REQUESTED,
  type EmailVerificationRequestedEvent,
} from '@app/contracts';
import type { DBAdapter, User } from 'better-auth';
import { randomUUID } from 'node:crypto';
import type { OutboxMessagesRepository } from '../database/repositories/outbox-messages.repository.js';

/** How long a verification link stays valid (Better Auth `emailVerification.expiresIn`, seconds). */
export const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;

export function toEmailVerificationRequestedEvent(
  user: Pick<User, 'id' | 'email' | 'name'>,
  url: string,
): EmailVerificationRequestedEvent {
  return {
    eventId: randomUUID(),
    eventType: EMAIL_VERIFICATION_REQUESTED,
    aggregateId: user.id,
    aggregateType: 'User',
    version: 1,
    timestamp: new Date().toISOString(),
    payload: { userId: user.id, email: user.email, name: user.name, url },
  };
}

/**
 * Better Auth's `sendVerificationEmail`: instead of sending, writes `EmailVerificationRequested`
 * to the outbox (inside the sign-up transaction when there is one); the notifications service
 * delivers the email. Registration therefore never waits for SMTP.
 */
export function verificationEmailRequester(
  outbox: OutboxMessagesRepository,
  baseAdapter: () => Promise<DBAdapter>,
) {
  return async ({ user, url }: { user: User; url: string }): Promise<void> => {
    await outbox.add(
      toOutboxMessage(
        AUTH_EVENTS_TOPIC,
        toEmailVerificationRequestedEvent(user, url),
      ),
      await baseAdapter(),
    );
  };
}
