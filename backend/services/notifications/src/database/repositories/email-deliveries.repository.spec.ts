import type { DataSource } from 'typeorm';
import { EmailDeliveriesRepository } from './email-deliveries.repository.js';

/** `query` serves both paths: plain `DataSource.query` and the query runner's structured result. */
function setup(rows: object[] = []) {
  const query = vi.fn(
    async (_sql: string, _params?: unknown[], structured?: boolean) =>
      structured ? { records: rows } : rows,
  );
  const release = vi.fn(async () => undefined);
  const dataSource = {
    query,
    createQueryRunner: () => ({ query, release }),
  } as unknown as DataSource;
  return {
    repository: new EmailDeliveriesRepository(dataSource),
    query,
    release,
  };
}

const row = {
  id: 'd-1',
  kind: 'verify-email',
  recipient: 'bob@example.com',
  attempts: '0',
  payload: { name: 'Bob' },
};

describe('EmailDeliveriesRepository', () => {
  it('claims with insert-or-ignore and a lease, returning the new delivery', async () => {
    const { repository, query } = setup([row]);

    const claimed = await repository.claim(
      {
        sourceEventId: 'e-1',
        kind: 'verify-email',
        recipient: 'bob@example.com',
        payload: { name: 'Bob' },
      },
      300_000,
    );

    expect(claimed).toEqual({ ...row, attempts: 0 });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (source_event_id, kind) DO NOTHING');
    expect(params).toEqual([
      'e-1',
      'verify-email',
      'bob@example.com',
      '{"name":"Bob"}',
      300,
    ]);
  });

  it('returns null when the event was already claimed', async () => {
    const { repository } = setup([]);

    await expect(
      repository.claim(
        { sourceEventId: 'e-1', kind: 'k', recipient: 'r', payload: {} },
        1000,
      ),
    ).resolves.toBeNull();
  });

  it('leases due rows with SKIP LOCKED, reading the structured UPDATE … RETURNING result', async () => {
    const { repository, query, release } = setup([row]);

    await expect(repository.leaseDue(10, 60_000)).resolves.toEqual([
      { ...row, attempts: 0 },
    ]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain("status = 'PENDING' AND next_attempt_at <= now()");
    expect(params).toEqual([10, 60]);
    expect(query.mock.calls[0][2]).toBe(true);
    expect(release).toHaveBeenCalled();
  });

  it('drops the payload once sent or failed', async () => {
    const { repository, query } = setup();

    await repository.markSent('d-1');
    await repository.markFailed('d-1', 'down');

    expect(query.mock.calls[0][0]).toContain("payload = '{}'");
    expect(query.mock.calls[1][0]).toContain("status = 'FAILED'");
    expect(query.mock.calls[1][0]).toContain("payload = '{}'");
  });
});
