import {
  BOARD_CREATED,
  USER_REGISTERED,
  type BoardCreatedEvent,
  type UserRegisteredEvent,
} from '@app/contracts';
import type { DataSource } from 'typeorm';
import { BoardRole } from '../database/entities/board-member.entity.js';
import { ProjectionHandler } from './projection.handler.js';

interface InsertCall {
  table: string;
  values: unknown;
  orIgnore: boolean;
}

function setup() {
  const inserts: InsertCall[] = [];
  const upsert = vi.fn().mockResolvedValue(undefined);
  const manager = {
    upsert,
    createQueryBuilder: () => {
      const call: InsertCall = {
        table: '',
        values: undefined,
        orIgnore: false,
      };
      const builder = {
        insert: () => builder,
        into: (entity: { name: string }) => {
          call.table = entity.name;
          return builder;
        },
        values: (values: unknown) => {
          call.values = values;
          return builder;
        },
        orIgnore: () => {
          call.orIgnore = true;
          return builder;
        },
        execute: async () => {
          inserts.push(call);
        },
      };
      return builder;
    },
  };
  const dataSource = {
    transaction: vi.fn((work: (m: typeof manager) => Promise<void>) =>
      work(manager),
    ),
  } as unknown as DataSource;

  return { handler: new ProjectionHandler(dataSource), inserts, upsert };
}

const boardCreated: BoardCreatedEvent = {
  eventId: 'e-1',
  eventType: BOARD_CREATED,
  aggregateId: 'board-1',
  aggregateType: 'Board',
  version: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  payload: {
    boardId: 'board-1',
    title: 'Sprint 1',
    description: null,
    owner: {
      userId: 'user-1',
      email: 'a@example.com',
      name: 'Alice',
      image: null,
    },
  },
};

describe('ProjectionHandler', () => {
  it('projects BoardCreated as owner user, board and OWNER membership, all insert-or-ignore', async () => {
    const { handler, inserts } = setup();

    await handler.apply(boardCreated);

    expect(inserts).toEqual([
      {
        table: 'User',
        values: {
          id: 'user-1',
          email: 'a@example.com',
          name: 'Alice',
          image: null,
        },
        orIgnore: true,
      },
      {
        table: 'Board',
        values: {
          id: 'board-1',
          title: 'Sprint 1',
          description: null,
          version: 1,
        },
        orIgnore: true,
      },
      {
        table: 'BoardMember',
        values: { boardId: 'board-1', userId: 'user-1', role: BoardRole.OWNER },
        orIgnore: true,
      },
    ]);
  });

  it('upserts users from UserRegistered', async () => {
    const { handler, upsert } = setup();
    const event: UserRegisteredEvent = {
      eventId: 'e-2',
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

    await handler.apply(event);

    expect(upsert).toHaveBeenCalledWith(
      expect.anything(),
      {
        id: 'user-1',
        email: 'a@example.com',
        name: 'Alice',
        image: 'https://example.com/a.png',
      },
      ['id'],
    );
  });

  it('ignores unknown events', async () => {
    const { handler, inserts, upsert } = setup();

    await handler.apply({ ...boardCreated, eventType: 'CardMoved' });

    expect(inserts).toEqual([]);
    expect(upsert).not.toHaveBeenCalled();
  });
});
