import type { KafkaProducerService } from '../kafka/kafka-producer.service.js';
import { OutboxRelay } from './outbox-relay.service.js';
import type { OutboxQuery, OutboxStore } from './outbox.js';

const rows = [
  {
    id: 'e-1',
    topic: 'board.events',
    key: 'b-1',
    event_type: 'BoardCreated',
    event: '{"n":1}',
  },
  {
    id: 'e-2',
    topic: 'board.events',
    key: 'b-2',
    event_type: 'BoardCreated',
    event: '{"n":2}',
  },
  {
    id: 'e-3',
    topic: 'auth.events',
    key: 'u-1',
    event_type: 'UserRegistered',
    event: '{"n":3}',
  },
];

function setup({
  locked = true,
  sendBatch = vi.fn().mockResolvedValue(undefined),
} = {}) {
  const query = vi.fn<OutboxQuery>(async (sql) => {
    if (sql.includes('pg_try_advisory_xact_lock')) return [{ locked }];
    if (sql.startsWith('SELECT')) return rows;
    return [];
  });
  const store: OutboxStore = { withTransaction: (work) => work(query) };
  const relay = new OutboxRelay(store, {
    sendBatch,
  } as unknown as KafkaProducerService);
  return { relay, query, sendBatch };
}

describe('OutboxRelay.relayBatch', () => {
  it('publishes rows in order, grouped by topic, then deletes them', async () => {
    const { relay, query, sendBatch } = setup();

    await expect(relay.relayBatch()).resolves.toBe(3);

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
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('DELETE'), [
      ['e-1', 'e-2', 'e-3'],
    ]);
  });

  it('keeps the rows when Kafka fails', async () => {
    const { relay, query } = setup({
      sendBatch: vi.fn().mockRejectedValue(new Error('broker down')),
    });

    await expect(relay.relayBatch()).rejects.toThrow('broker down');
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE'),
      expect.anything(),
    );
  });

  it('does nothing while another relay holds the lock', async () => {
    const { relay, query, sendBatch } = setup({ locked: false });

    await expect(relay.relayBatch()).resolves.toBe(0);
    expect(query).toHaveBeenCalledTimes(1);
    expect(sendBatch).not.toHaveBeenCalled();
  });
});
