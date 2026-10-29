import { OutboxRepository } from './outbox.repository.js';
import type { OutboxQuery, OutboxStore } from './outbox.js';

const rows = [
  {
    id: 'e-1',
    topic: 'board.events',
    key: 'b-1',
    event_type: 'BoardCreated',
    event: '{}',
  },
  {
    id: 'e-2',
    topic: 'auth.events',
    key: 'u-1',
    event_type: 'UserRegistered',
    event: '{}',
  },
];

function setup(locked = true) {
  const query = vi.fn<OutboxQuery>(async (sql) => {
    if (sql.includes('pg_try_advisory_xact_lock')) return [{ locked }];
    if (sql.startsWith('SELECT')) return rows;
    return [];
  });
  const store: OutboxStore = { withTransaction: (work) => work(query) };
  return { repository: new OutboxRepository(store), query };
}

describe('OutboxRepository.processBatch', () => {
  it('hands rows to publish in order, then deletes them', async () => {
    const { repository, query } = setup();
    const publish = vi.fn().mockResolvedValue(undefined);

    await expect(repository.processBatch(100, publish)).resolves.toBe(2);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $1'),
      [100],
    );
    expect(publish).toHaveBeenCalledWith([
      {
        id: 'e-1',
        topic: 'board.events',
        key: 'b-1',
        eventType: 'BoardCreated',
        event: '{}',
      },
      {
        id: 'e-2',
        topic: 'auth.events',
        key: 'u-1',
        eventType: 'UserRegistered',
        event: '{}',
      },
    ]);
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('DELETE'), [
      ['e-1', 'e-2'],
    ]);
  });

  it('keeps the rows when publish fails', async () => {
    const { repository, query } = setup();

    await expect(
      repository.processBatch(
        100,
        vi.fn().mockRejectedValue(new Error('broker down')),
      ),
    ).rejects.toThrow('broker down');
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE'),
      expect.anything(),
    );
  });

  it('does nothing while another relay holds the lock', async () => {
    const { repository, query } = setup(false);
    const publish = vi.fn();

    await expect(repository.processBatch(100, publish)).resolves.toBe(0);
    expect(query).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });
});
