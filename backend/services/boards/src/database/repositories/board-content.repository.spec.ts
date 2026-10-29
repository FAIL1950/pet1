import type { DataSource, EntityManager } from 'typeorm';
import { BoardRole } from '../entities/board-member.entity.js';
import { BoardContentRepository } from './board-content.repository.js';
import { BoardWriteRunner } from './board-write.js';
import type { OutboxMessagesRepository } from './outbox-messages.repository.js';

const EDITORS = [BoardRole.OWNER, BoardRole.EDITOR];
const event = {
  id: 'e-1',
  topic: 'board.events',
  key: 'b-1',
  eventType: 'X',
  event: '{}',
};
const editor = { version: 4, role: BoardRole.EDITOR };

interface SetupOptions {
  access?: { version: number; role: BoardRole };
  /** Result of the position query (the last item, or the next one after the neighbour). */
  positionRow?: { position: string };
  /** Rows returned by `findOneBy`, keyed by id. */
  rows?: Record<string, object>;
  columnExists?: boolean;
}

function setup({
  access,
  positionRow,
  rows = {},
  columnExists = true,
}: SetupOptions = {}) {
  const calls: string[] = [];
  const conditions: string[] = [];
  const queryBuilder = () => {
    let locked = false;
    const builder = {
      innerJoin: () => builder,
      select: () => builder,
      addSelect: () => builder,
      where: (condition: string) => {
        conditions.push(condition);
        return builder;
      },
      andWhere: (condition: string) => {
        conditions.push(condition);
        return builder;
      },
      orderBy: () => builder,
      limit: () => builder,
      setLock: vi.fn(() => {
        locked = true;
        return builder;
      }),
      getRawOne: async () => {
        if (locked) {
          calls.push('lock');
          return access;
        }
        return positionRow;
      },
    };
    return builder;
  };
  const manager = {
    createQueryBuilder: queryBuilder,
    findOneBy: async (_entity: unknown, where: { id: string }) =>
      rows[where.id] ? { ...rows[where.id] } : null,
    existsBy: async () => columnExists,
    create: (_entity: unknown, values: object) => values,
    save: async (values: object) => {
      calls.push('save');
      return values;
    },
    delete: vi.fn(async () => {
      calls.push('delete');
    }),
    update: vi.fn(async () => {
      calls.push('update version');
    }),
  } as unknown as EntityManager;
  const add = vi.fn(async () => {
    calls.push('outbox');
  });
  const repository = new BoardContentRepository(
    new BoardWriteRunner(
      {
        transaction: (work: (m: EntityManager) => Promise<unknown>) =>
          work(manager),
      } as unknown as DataSource,
      { add } as unknown as OutboxMessagesRepository,
    ),
  );
  return { repository, manager, add, calls, conditions };
}

const base = {
  boardId: 'b-1',
  userId: 'u-1',
  allowedRoles: EDITORS,
  toEvents: () => [event],
};

describe('BoardContentRepository.addColumn', () => {
  it('locks the board, appends after the last column, bumps the version and writes events', async () => {
    const { repository, manager, add, calls } = setup({
      access: editor,
      positionRow: { position: 'a0' },
    });
    const toEvents = vi.fn(() => [event]);

    const result = await repository.addColumn({
      ...base,
      column: { id: 'c-1', title: 'To do' },
      toEvents,
    });

    expect(calls).toEqual(['lock', 'save', 'update version', 'outbox']);
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

  it('returns not_found for non-members and forbidden for viewers, writing nothing', async () => {
    const write = { ...base, column: { id: 'c-1', title: 'To do' } };

    const stranger = setup();
    await expect(stranger.repository.addColumn(write)).resolves.toEqual({
      status: 'not_found',
    });
    expect(stranger.calls).toEqual(['lock']);

    const viewer = setup({ access: { version: 1, role: BoardRole.VIEWER } });
    await expect(viewer.repository.addColumn(write)).resolves.toEqual({
      status: 'forbidden',
    });
    expect(viewer.calls).toEqual(['lock']);
  });
});

describe('BoardContentRepository.addCard', () => {
  const write = {
    ...base,
    columnId: 'c-1',
    card: { id: 'k-1', title: 'Fix', description: null, createdBy: 'u-1' },
  };

  it('appends the card to the end of the column', async () => {
    const { repository, calls } = setup({ access: editor });

    await expect(repository.addCard(write)).resolves.toEqual({
      status: 'ok',
      value: { ...write.card, boardId: 'b-1', columnId: 'c-1', position: 'a0' },
    });
    expect(calls).toEqual(['lock', 'save', 'update version', 'outbox']);
  });

  it('returns not_found for a column of another board', async () => {
    const { repository, calls } = setup({
      access: editor,
      columnExists: false,
    });

    await expect(repository.addCard(write)).resolves.toEqual({
      status: 'not_found',
    });
    expect(calls).toEqual(['lock']);
  });
});

describe('BoardContentRepository column edits', () => {
  const columns = {
    'c-1': { id: 'c-1', boardId: 'b-1', title: 'To do', position: 'a2' },
    'c-2': { id: 'c-2', boardId: 'b-1', title: 'Done', position: 'a0' },
  };

  it('renames a column', async () => {
    const { repository } = setup({ access: editor, rows: columns });

    await expect(
      repository.updateColumn({
        ...base,
        columnId: 'c-1',
        changes: { title: 'Doing' },
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: { ...columns['c-1'], title: 'Doing' },
    });
  });

  it('moves a column between its new neighbours, skipping itself', async () => {
    const { repository, conditions } = setup({
      access: editor,
      rows: columns,
      positionRow: { position: 'a1' },
    });

    const result = await repository.moveColumn({
      ...base,
      columnId: 'c-1',
      afterColumnId: 'c-2',
    });

    // Between 'a0' (after c-2) and 'a1' (the next column).
    expect(result).toMatchObject({ status: 'ok' });
    const { position } = (result as { value: { position: string } }).value;
    expect(position > 'a0' && position < 'a1').toBe(true);
    expect(conditions).toContain('item.id != :excludeId');
    expect(conditions).toContain('item.position > :after');
  });

  it.each([
    ['an unknown column', { columnId: 'c-x', afterColumnId: null }],
    ['an unknown neighbour', { columnId: 'c-1', afterColumnId: 'c-x' }],
    ['itself as neighbour', { columnId: 'c-1', afterColumnId: 'c-1' }],
  ])('returns not_found when moving %s', async (_case, move) => {
    const { repository, calls } = setup({ access: editor, rows: columns });

    await expect(repository.moveColumn({ ...base, ...move })).resolves.toEqual({
      status: 'not_found',
    });
    expect(calls).toEqual(['lock']);
  });

  it('deletes a column and returns it for the event', async () => {
    const { repository, calls } = setup({ access: editor, rows: columns });

    await expect(
      repository.deleteColumn({ ...base, columnId: 'c-1' }),
    ).resolves.toEqual({ status: 'ok', value: columns['c-1'] });
    expect(calls).toEqual(['lock', 'delete', 'update version', 'outbox']);
  });
});

describe('BoardContentRepository card edits', () => {
  const cards = {
    'k-1': { id: 'k-1', boardId: 'b-1', columnId: 'c-1', position: 'a0' },
    'k-2': { id: 'k-2', boardId: 'b-1', columnId: 'c-2', position: 'a5' },
  };

  it('moves a card to another column after a card there', async () => {
    const { repository } = setup({ access: editor, rows: cards });

    const result = await repository.moveCard({
      ...base,
      cardId: 'k-1',
      columnId: 'c-2',
      afterCardId: 'k-2',
    });

    expect(result).toEqual({
      status: 'ok',
      value: {
        card: { ...cards['k-1'], columnId: 'c-2', position: 'a6' },
        fromColumnId: 'c-1',
      },
    });
  });

  it('returns not_found when the target column is not on the board', async () => {
    const { repository } = setup({
      access: editor,
      rows: cards,
      columnExists: false,
    });

    await expect(
      repository.moveCard({
        ...base,
        cardId: 'k-1',
        columnId: 'c-x',
        afterCardId: null,
      }),
    ).resolves.toEqual({ status: 'not_found' });
  });

  it('updates and deletes cards', async () => {
    const { repository } = setup({ access: editor, rows: cards });

    await expect(
      repository.updateCard({
        ...base,
        cardId: 'k-1',
        changes: { title: 'New', description: null },
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: { ...cards['k-1'], title: 'New', description: null },
    });
    await expect(
      repository.deleteCard({ ...base, cardId: 'k-2' }),
    ).resolves.toEqual({ status: 'ok', value: cards['k-2'] });
  });
});
