import { AUTH_EVENTS_TOPIC, USER_REGISTERED } from '@app/contracts';
import type { User } from 'better-auth';
import type { KafkaProducerService } from '@app/common';
import { UserRegisteredHook } from './user-registered.hook.js';

vi.mock('@app/common', () => ({
  KafkaProducerService: class {},
}));

const user: User = {
  id: 'user-1',
  email: 'a@example.com',
  name: 'Alice',
  emailVerified: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('UserRegisteredHook', () => {
  it('publishes UserRegistered to auth.events keyed by user id', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const hook = new UserRegisteredHook({
      publish,
    } as unknown as KafkaProducerService);

    await hook.onUserCreated(user);

    expect(publish).toHaveBeenCalledWith(
      AUTH_EVENTS_TOPIC,
      expect.objectContaining({
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
      }),
    );
  });

  it('does not fail registration when publishing fails', async () => {
    const publish = vi.fn().mockRejectedValue(new Error('broker down'));
    const hook = new UserRegisteredHook({
      publish,
    } as unknown as KafkaProducerService);

    await expect(hook.onUserCreated(user)).resolves.toBeUndefined();
  });
});
