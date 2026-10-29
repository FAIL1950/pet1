import type { DataSource, EntityManager } from 'typeorm';
import { BoardRole } from '../entities/board-member.entity.js';
import { BoardsRepository } from './boards.repository.js';
import type { OutboxMessagesRepository } from './outbox-messages.repository.js';
import type { UsersRepository } from './users.repository.js';

const owner = {
  id: 'user-1',
  email: 'a@example.com',
  name: 'Alice',
  image: null,
};
const board = {
  id: 'board-1',
  title: 'Sprint 1',
  description: null,
  version: 1,
};
const events = [
  {
    id: 'e-1',
    topic: 'board.events',
    key: 'board-1',
    eventType: 'BoardCreated',
    event: '{}',
  },
];

function setup() {
  const calls: string[] = [];
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const manager = {
    create: (_entity: unknown, values: object) => values,
    save: vi.fn(async (values: object) => {
      calls.push('save Board');
      return { ...values, createdAt };
    }),
    insert: vi.fn(async (entity: { name: string }) => {
      calls.push(`insert ${entity.name}`);
    }),
  } as unknown as EntityManager;
  const transaction = vi.fn((work: (m: EntityManager) => Promise<unknown>) =>
    work(manager),
  );
  const insertIfMissing = vi.fn(async () => {
    calls.push('users.insertIfMissing');
  });
  const add = vi.fn(async () => {
    calls.push('outbox.add');
  });
  const repository = new BoardsRepository(
    { transaction } as unknown as DataSource,
    { insertIfMissing } as unknown as UsersRepository,
    { add } as unknown as OutboxMessagesRepository,
  );
  return {
    repository,
    manager,
    transaction,
    insertIfMissing,
    add,
    calls,
    createdAt,
  };
}

describe('BoardsRepository.createWithOwner', () => {
  it('writes owner, board, OWNER membership and events in one transaction', async () => {
    const {
      repository,
      manager,
      transaction,
      insertIfMissing,
      add,
      calls,
      createdAt,
    } = setup();

    await expect(
      repository.createWithOwner({ board, owner, events }),
    ).resolves.toEqual({ ...board, createdAt });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      'users.insertIfMissing',
      'save Board',
      'insert BoardMember',
      'outbox.add',
    ]);
    expect(insertIfMissing).toHaveBeenCalledWith(owner, manager);
    expect(manager.insert).toHaveBeenCalledWith(expect.anything(), {
      boardId: 'board-1',
      userId: 'user-1',
      role: BoardRole.OWNER,
    });
    expect(add).toHaveBeenCalledWith(events, manager);
  });
});
