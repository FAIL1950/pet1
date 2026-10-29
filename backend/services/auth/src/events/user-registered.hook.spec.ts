import type { OutboxMessage } from '@app/common';
import { AUTH_EVENTS_TOPIC, USER_REGISTERED } from '@app/contracts';
import type { DBAdapter, User } from 'better-auth';
import type { OutboxMessagesRepository } from '../database/repositories/outbox-messages.repository.js';
import {
  UserRegisteredHook,
  type HookContext,
} from './user-registered.hook.js';

const user: User = {
  id: 'user-1',
  email: 'a@example.com',
  name: 'Alice',
  emailVerified: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const adapter = {} as DBAdapter;
const ctx: HookContext = { context: { adapter } };

function setup(
  add = vi.fn<(m: OutboxMessage, a: DBAdapter | undefined) => Promise<void>>(
    async () => undefined,
  ),
) {
  const hook = new UserRegisteredHook({
    add,
  } as unknown as OutboxMessagesRepository);
  return { hook, add };
}

describe('UserRegisteredHook', () => {
  it('writes UserRegistered to the outbox, keyed by user id', async () => {
    const { hook, add } = setup();

    await expect(hook.onUserCreate(user, ctx)).resolves.toEqual({ data: user });

    expect(add).toHaveBeenCalledTimes(1);
    const [message, fallback] = add.mock.calls[0];
    expect(fallback).toBe(adapter);
    expect(message).toMatchObject({
      topic: AUTH_EVENTS_TOPIC,
      key: 'user-1',
      eventType: USER_REGISTERED,
    });
    expect(JSON.parse(message.event)).toMatchObject({
      eventId: message.id,
      eventType: USER_REGISTERED,
      aggregateId: 'user-1',
      aggregateType: 'User',
      version: 1,
      payload: {
        userId: 'user-1',
        email: 'a@example.com',
        name: 'Alice',
        image: null,
        emailVerified: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('assigns the user id when Better Auth has not yet', async () => {
    const { hook, add } = setup();
    const { id: _id, ...withoutId } = user;

    const { data } = await hook.onUserCreate(withoutId as User, ctx);

    expect(data.id).toEqual(expect.any(String));
    expect(add.mock.calls[0][0].key).toBe(data.id);
  });

  it('fails the registration when the outbox cannot be written', async () => {
    const { hook } = setup(vi.fn().mockRejectedValue(new Error('db down')));

    await expect(hook.onUserCreate(user, ctx)).rejects.toThrow('db down');
  });
});
