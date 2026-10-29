import type { KafkaProducerService } from '../kafka/kafka-producer.service.js';
import { OUTBOX_BATCH_SIZE, OutboxRelay } from './outbox-relay.service.js';
import type { OutboxMessage } from './outbox.js';
import type { OutboxRepository } from './outbox.repository.js';

const messages: OutboxMessage[] = [
  {
    id: 'e-1',
    topic: 'board.events',
    key: 'b-1',
    eventType: 'BoardCreated',
    event: '{"n":1}',
  },
  {
    id: 'e-2',
    topic: 'board.events',
    key: 'b-2',
    eventType: 'BoardCreated',
    event: '{"n":2}',
  },
  {
    id: 'e-3',
    topic: 'auth.events',
    key: 'u-1',
    eventType: 'UserRegistered',
    event: '{"n":3}',
  },
];

describe('OutboxRelay.relayBatch', () => {
  it('sends a batch to Kafka grouped by topic, keeping the order', async () => {
    const processBatch = vi.fn(
      async (
        _limit: number,
        publish: (m: OutboxMessage[]) => Promise<void>,
      ) => {
        await publish(messages);
        return messages.length;
      },
    );
    const sendBatch = vi.fn().mockResolvedValue(undefined);
    const relay = new OutboxRelay(
      { processBatch } as unknown as OutboxRepository,
      { sendBatch } as unknown as KafkaProducerService,
    );

    await expect(relay.relayBatch()).resolves.toBe(3);

    expect(processBatch).toHaveBeenCalledWith(
      OUTBOX_BATCH_SIZE,
      expect.any(Function),
    );
    expect(sendBatch).toHaveBeenCalledWith([
      {
        topic: 'board.events',
        messages: [
          {
            key: 'b-1',
            value: '{"n":1}',
            headers: { eventType: 'BoardCreated' },
          },
          {
            key: 'b-2',
            value: '{"n":2}',
            headers: { eventType: 'BoardCreated' },
          },
        ],
      },
      {
        topic: 'auth.events',
        messages: [
          {
            key: 'u-1',
            value: '{"n":3}',
            headers: { eventType: 'UserRegistered' },
          },
        ],
      },
    ]);
  });
});
