import { BOARD_CREATED, BOARD_EVENTS_TOPIC } from '@app/contracts';
import type { AuthUser } from '@app/common';
import type { DataSource } from 'typeorm';
import { BoardRole } from '../database/entities/board-member.entity.js';
import {
  BoardCommandsService,
  toBoardCreatedEvent,
} from './board-commands.service.js';

const user: AuthUser = {
  id: 'user-1',
  email: 'a@example.com',
  name: 'Alice',
  image: 'https://example.com/a.png',
};

const input = { title: 'Sprint 1', description: null };

interface Write {
  entity: string;
  values: Record<string, unknown>;
  orIgnore?: boolean;
}

function setup() {
  const writes: Write[] = [];
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const manager = {
    createQueryBuilder: () => {
      const write: Write = { entity: '', values: {} };
      const builder = {
        insert: () => builder,
        into: (entity: { name: string }) => {
          write.entity = entity.name;
          return builder;
        },
        values: (values: Record<string, unknown>) => {
          write.values = values;
          return builder;
        },
        orIgnore: () => {
          write.orIgnore = true;
          return builder;
        },
        execute: async () => {
          writes.push(write);
        },
      };
      return builder;
    },
    create: (_entity: { name: string }, values: Record<string, unknown>) =>
      values,
    save: async (values: Record<string, unknown>) => {
      writes.push({ entity: 'Board', values });
      return { ...values, createdAt };
    },
    insert: async (
      entity: { name: string },
      values: Record<string, unknown>,
    ) => {
      writes.push({ entity: entity.name, values });
    },
  };
  const transaction = vi.fn((work: (m: typeof manager) => Promise<unknown>) =>
    work(manager),
  );
  const service = new BoardCommandsService({
    transaction,
  } as unknown as DataSource);
  return { service, writes, transaction, createdAt };
}

describe('toBoardCreatedEvent', () => {
  it('builds a version-1 BoardCreated event with an owner snapshot', () => {
    const event = toBoardCreatedEvent('board-1', user, input);

    expect(event).toMatchObject({
      eventType: BOARD_CREATED,
      aggregateId: 'board-1',
      aggregateType: 'Board',
      version: 1,
      payload: {
        boardId: 'board-1',
        title: 'Sprint 1',
        description: null,
        owner: {
          userId: 'user-1',
          email: 'a@example.com',
          name: 'Alice',
          image: 'https://example.com/a.png',
        },
      },
    });
  });
});

describe('BoardCommandsService.createBoard', () => {
  it('writes the board, OWNER membership and BoardCreated outbox row in one transaction', async () => {
    const { service, writes, transaction, createdAt } = setup();

    const board = await service.createBoard(user, input);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(writes.map((w) => w.entity)).toEqual([
      'User',
      'Board',
      'BoardMember',
      'OutboxMessage',
    ]);
    expect(writes[0]).toMatchObject({
      values: { id: 'user-1', email: 'a@example.com' },
      orIgnore: true,
    });

    const boardId = board.id;
    expect(board).toMatchObject({
      title: 'Sprint 1',
      description: null,
      version: 1,
      createdAt,
    });
    expect(writes[2].values).toEqual({
      boardId,
      userId: 'user-1',
      role: BoardRole.OWNER,
    });

    const outbox = writes[3].values;
    expect(outbox).toMatchObject({
      topic: BOARD_EVENTS_TOPIC,
      key: boardId,
      eventType: BOARD_CREATED,
    });
    const event = JSON.parse(outbox.event as string);
    expect(outbox.id).toBe(event.eventId);
    expect(event).toMatchObject({
      aggregateId: boardId,
      version: 1,
      payload: { boardId, title: 'Sprint 1' },
    });
  });
});
