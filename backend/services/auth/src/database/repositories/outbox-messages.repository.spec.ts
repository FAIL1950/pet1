import type { DBAdapter } from 'better-auth';
import { OUTBOX_MODEL } from '../outbox.plugin.js';
import { OutboxMessagesRepository } from './outbox-messages.repository.js';

const message = {
  id: 'e-1',
  topic: 'auth.events',
  key: 'user-1',
  eventType: 'UserRegistered',
  event: '{}',
};

describe('OutboxMessagesRepository.add', () => {
  it('creates an outbox row with the event id, outside a transaction via the fallback adapter', async () => {
    const create = vi.fn().mockResolvedValue(undefined);

    await new OutboxMessagesRepository().add(message, {
      create,
    } as unknown as DBAdapter);

    expect(create).toHaveBeenCalledWith({
      model: OUTBOX_MODEL,
      data: { ...message, createdAt: expect.any(Date) },
      forceAllowId: true,
    });
  });

  it('fails without an adapter', async () => {
    await expect(
      new OutboxMessagesRepository().add(message, undefined),
    ).rejects.toThrow('No Better Auth adapter');
  });
});
