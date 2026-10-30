import {
  AUTH_EVENTS_TOPIC,
  EMAIL_VERIFICATION_REQUESTED,
} from '@app/contracts';
import type { DBAdapter, User } from 'better-auth';
import type { OutboxMessagesRepository } from '../database/repositories/outbox-messages.repository.js';
import { verificationEmailRequester } from './email-verification.js';

const user: User = {
  id: 'user-1',
  email: 'bob@example.com',
  name: 'Bob',
  emailVerified: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('verificationEmailRequester', () => {
  it('writes EmailVerificationRequested to the outbox instead of sending', async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const adapter = {} as DBAdapter;
    const send = verificationEmailRequester(
      { add } as unknown as OutboxMessagesRepository,
      async () => adapter,
    );

    await send({ user, url: 'http://localhost/api/auth/verify-email?token=t' });

    const [message, fallback] = add.mock.calls[0];
    expect(fallback).toBe(adapter);
    expect(message).toMatchObject({
      topic: AUTH_EVENTS_TOPIC,
      key: 'user-1',
      eventType: EMAIL_VERIFICATION_REQUESTED,
    });
    expect(JSON.parse(message.event).payload).toEqual({
      userId: 'user-1',
      email: 'bob@example.com',
      name: 'Bob',
      url: 'http://localhost/api/auth/verify-email?token=t',
    });
  });
});
