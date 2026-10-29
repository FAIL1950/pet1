import { BOARD_CREATED, BOARD_EVENTS_TOPIC } from '@app/contracts';
import type { AuthUser, KafkaProducerService } from '@app/common';
import type { Repository } from 'typeorm';
import type { Board } from '../database/entities/board.entity.js';
import {
  BoardCommandsService,
  PROJECTION_POLL_INTERVAL_MS,
  PROJECTION_WAIT_TIMEOUT_MS,
  toBoardCreatedEvent,
} from './board-commands.service.js';

vi.mock('@app/common', () => ({
  KafkaProducerService: class {},
}));

// Polling sleeps advance a fake clock instead of waiting.
let now = 0;
vi.mock('node:timers/promises', () => ({
  setTimeout: vi.fn(async (ms: number) => {
    now += ms;
  }),
}));

const user: AuthUser = {
  id: 'user-1',
  email: 'a@example.com',
  name: 'Alice',
  image: 'https://example.com/a.png',
};

const input = { title: 'Sprint 1', description: null };

function setup(findOneBy: (where: { id: string }) => Promise<Board | null>) {
  const publish = vi.fn().mockResolvedValue(undefined);
  const service = new BoardCommandsService(
    { publish } as unknown as KafkaProducerService,
    { findOneBy: vi.fn(findOneBy) } as unknown as Repository<Board>,
  );
  return { service, publish };
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
  beforeEach(() => {
    now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes BoardCreated to board.events and returns the projected board', async () => {
    const board = { id: 'projected' } as Board;
    const { service, publish } = setup(async () => board);

    const result = await service.createBoard(user, input);

    expect(publish).toHaveBeenCalledWith(
      BOARD_EVENTS_TOPIC,
      expect.objectContaining({ eventType: BOARD_CREATED }),
    );
    const event = publish.mock.calls[0][1];
    expect(event.aggregateId).toBe(event.payload.boardId);
    expect(result).toEqual({ status: 'created', board });
  });

  it('waits for the projection to catch up', async () => {
    const board = { id: 'projected' } as Board;
    let calls = 0;
    const { service } = setup(async () => (++calls < 3 ? null : board));

    await expect(service.createBoard(user, input)).resolves.toEqual({
      status: 'created',
      board,
    });
    expect(now).toBe(2 * PROJECTION_POLL_INTERVAL_MS);
  });

  it('reports pending with the board id when the projection is too slow', async () => {
    const { service, publish } = setup(async () => null);

    const result = await service.createBoard(user, input);

    const boardId = publish.mock.calls[0][1].payload.boardId;
    expect(result).toEqual({ status: 'pending', boardId });
    expect(now).toBeGreaterThanOrEqual(PROJECTION_WAIT_TIMEOUT_MS);
  });
});
