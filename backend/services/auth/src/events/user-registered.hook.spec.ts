import { AUTH_EVENTS_TOPIC, USER_REGISTERED } from '@app/contracts';
import type { DBAdapter, User } from 'better-auth';
import { OUTBOX_MODEL } from './outbox.plugin.js';
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

function setup(create = vi.fn().mockResolvedValue(undefined)) {
  // Outside a transaction `getCurrentAdapter` falls back to the context's adapter.
  const ctx: HookContext = {
    context: { adapter: { create } as unknown as DBAdapter },
  };
  return { hook: new UserRegisteredHook(), ctx, create };
}

describe('UserRegisteredHook', () => {
  it('writes UserRegistered to the outbox, keyed by user id', async () => {
    const { hook, ctx, create } = setup();

    await expect(hook.onUserCreate(user, ctx)).resolves.toEqual({ data: user });

    expect(create).toHaveBeenCalledTimes(1);
    const { model, data, forceAllowId } = create.mock.calls[0][0];
    expect(model).toBe(OUTBOX_MODEL);
    expect(forceAllowId).toBe(true);
    expect(data).toMatchObject({
      topic: AUTH_EVENTS_TOPIC,
      key: 'user-1',
      eventType: USER_REGISTERED,
    });

    const event = JSON.parse(data.event);
    expect(data.id).toBe(event.eventId);
    expect(event).toMatchObject({
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
    const { hook, ctx, create } = setup();
    const { id: _id, ...withoutId } = user;

    const { data } = await hook.onUserCreate(withoutId as User, ctx);

    expect(data.id).toEqual(expect.any(String));
    expect(JSON.parse(create.mock.calls[0][0].data.event).aggregateId).toBe(
      data.id,
    );
  });

  it('fails the registration when the outbox cannot be written', async () => {
    const { hook, ctx } = setup(
      vi.fn().mockRejectedValue(new Error('db down')),
    );

    await expect(hook.onUserCreate(user, ctx)).rejects.toThrow('db down');
  });
});
