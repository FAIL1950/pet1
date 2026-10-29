import { USER_REGISTERED, type UserRegisteredEvent } from '@app/contracts';
import type { UsersRepository } from '../database/repositories/users.repository.js';
import { UsersProjectionHandler } from './users-projection.handler.js';

function setup() {
  const upsert = vi.fn().mockResolvedValue(undefined);
  const users = { upsert } as unknown as UsersRepository;
  return { handler: new UsersProjectionHandler(users), upsert };
}

const userRegistered: UserRegisteredEvent = {
  eventId: 'e-1',
  eventType: USER_REGISTERED,
  aggregateId: 'user-1',
  aggregateType: 'User',
  version: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  payload: {
    userId: 'user-1',
    email: 'a@example.com',
    name: 'Alice',
    image: 'https://example.com/a.png',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('UsersProjectionHandler', () => {
  it('upserts users from UserRegistered', async () => {
    const { handler, upsert } = setup();

    await handler.apply(userRegistered);

    expect(upsert).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'a@example.com',
      name: 'Alice',
      image: 'https://example.com/a.png',
    });
  });

  it('ignores other events', async () => {
    const { handler, upsert } = setup();

    await handler.apply({ ...userRegistered, eventType: 'BoardCreated' });

    expect(upsert).not.toHaveBeenCalled();
  });
});
