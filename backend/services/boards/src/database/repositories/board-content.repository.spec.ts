import type { DataSource, EntityManager } from 'typeorm';
import { BoardRole } from '../entities/board-member.entity.js';
import { BoardContentRepository } from './board-content.repository.js';
import type { OutboxMessagesRepository } from './outbox-messages.repository.js';

const EDITORS = [BoardRole.OWNER, BoardRole.EDITOR];
const event = {
  id: 'e-1',
  topic: 'board.events',
  key: 'b-1',
  eventType: 'X',
  event: '{}',
};

interface SetupOptions {
  access?: { version: number; role: BoardRole };
  lastPosition?: string;
  columnExists?: boolean;
}

function setup({
  access,
  lastPosition,
  columnExists = true,
}: SetupOptions = {}) {
  const calls: string[] = [];
  const builder = {
    innerJoin: () => builder,
    select: () => builder,
    addSelect: () => builder,
    where: () => builder,
    setLock: vi.fn(() => builder),
    getRawOne: async () => {
      calls.push('lock');
      return access;
    },
  };
  const manager = {
    createQueryBuilder: () => builder,
    findOne: async () => (lastPosition ? { position: lastPosition } : null),
    existsBy: async () => columnExists,
    create: (_entity: unknown, values: object) => values,
    save: async (values: object) => {
      calls.push('save');
      return values;
    },
    update: vi.fn(async () => {
      calls.push('update version');
    }),
  } as unknown as EntityManager;
  const add = vi.fn(async () => {
    calls.push('outbox');
  });
  const repository = new BoardContentRepository(
    {
      transaction: (work: (m: EntityManager) => Promise<unknown>) =>
        work(manager),
    } as unknown as DataSource,
    { add } as unknown as OutboxMessagesRepository,
  );
  return { repository, manager, builder, add, calls };
}

const editor = { version: 4, role: BoardRole.EDITOR };

const columnWrite = {
  boardId: 'b-1',
  userId: 'u-1',
  allowedRoles: EDITORS,
  column: { id: 'c-1', title: 'To do' },
  toEvents: () => [event],
};

describe('BoardContentRepository.addColumn', () => {
  it('locks the board, appends the column, bumps the version and writes events', async () => {
    const { repository, manager, builder, add, calls } = setup({
      access: editor,
      lastPosition: 'a0',
    });
    const toEvents = vi.fn(() => [event]);

    const result = await repository.addColumn({ ...columnWrite, toEvents });

    expect(calls).toEqual(['lock', 'save', 'update version', 'outbox']);
    expect(builder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
      undefined,
      ['board'],
    );
    expect(result).toEqual({
      status: 'ok',
      value: { id: 'c-1', title: 'To do', boardId: 'b-1', position: 'a1' },
    });
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'b-1' },
      { version: 5 },
    );
    expect(toEvents).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c-1' }),
      5,
    );
    expect(add).toHaveBeenCalledWith([event], manager);
  });

  it('returns not_found for non-members, writing nothing', async () => {
    const { repository, calls } = setup();

    await expect(repository.addColumn(columnWrite)).resolves.toEqual({
      status: 'not_found',
    });
    expect(calls).toEqual(['lock']);
  });

  it('returns forbidden for viewers, writing nothing', async () => {
    const { repository, calls } = setup({
      access: { version: 1, role: BoardRole.VIEWER },
    });

    await expect(repository.addColumn(columnWrite)).resolves.toEqual({
      status: 'forbidden',
    });
    expect(calls).toEqual(['lock']);
  });
});

describe('BoardContentRepository.addCard', () => {
  const cardWrite = {
    boardId: 'b-1',
    columnId: 'c-1',
    userId: 'u-1',
    allowedRoles: EDITORS,
    card: { id: 'k-1', title: 'Fix', description: null, createdBy: 'u-1' },
    toEvents: () => [event],
  };

  it('appends the card to the end of the column', async () => {
    const { repository, calls } = setup({ access: editor });

    await expect(repository.addCard(cardWrite)).resolves.toEqual({
      status: 'ok',
      value: {
        ...cardWrite.card,
        boardId: 'b-1',
        columnId: 'c-1',
        position: 'a0',
      },
    });
    expect(calls).toEqual(['lock', 'save', 'update version', 'outbox']);
  });

  it('returns not_found for a column of another board', async () => {
    const { repository, calls } = setup({
      access: editor,
      columnExists: false,
    });

    await expect(repository.addCard(cardWrite)).resolves.toEqual({
      status: 'not_found',
    });
    expect(calls).toEqual(['lock']);
  });
});
