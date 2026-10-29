import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  BOARD_CREATED,
  BOARD_EVENTS_TOPIC,
  CARD_CREATED,
  COLUMN_CREATED,
} from '@app/contracts';
import type { AuthUser } from '@app/common';
import type { BoardColumn } from '../database/entities/board-column.entity.js';
import { BoardRole } from '../database/entities/board-member.entity.js';
import type { Board } from '../database/entities/board.entity.js';
import type { Card } from '../database/entities/card.entity.js';
import type {
  BoardContentRepository,
  BoardWriteResult,
  NewCard,
  NewColumn,
} from '../database/repositories/board-content.repository.js';
import type {
  BoardsRepository,
  NewBoard,
} from '../database/repositories/boards.repository.js';
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
  it('persists the board with its owner and the BoardCreated event', async () => {
    const saved = { id: 'saved' } as Board;
    const createWithOwner = vi.fn<(b: NewBoard) => Promise<Board>>(
      async () => saved,
    );
    const service = new BoardCommandsService(
      { createWithOwner } as unknown as BoardsRepository,
      {} as BoardContentRepository,
    );

    await expect(service.createBoard(user, input)).resolves.toBe(saved);

    const { board, owner, events } = createWithOwner.mock.calls[0][0];
    expect(board).toEqual({
      id: expect.any(String),
      title: 'Sprint 1',
      description: null,
      version: 1,
    });
    expect(owner).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      name: 'Alice',
      image: 'https://example.com/a.png',
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      topic: BOARD_EVENTS_TOPIC,
      key: board.id,
      eventType: BOARD_CREATED,
    });
    expect(JSON.parse(events[0].event)).toMatchObject({
      eventId: events[0].id,
      aggregateId: board.id,
      version: 1,
    });
  });
});

const column = {
  id: 'column-1',
  boardId: 'board-1',
  title: 'To do',
  position: 'a0',
} as BoardColumn;

const card = {
  id: 'card-1',
  boardId: 'board-1',
  columnId: 'column-1',
  title: 'Fix bug',
  description: null,
  position: 'a0',
  createdBy: 'user-1',
} as Card;

function contentService(content: Partial<BoardContentRepository>) {
  return new BoardCommandsService(
    {} as BoardsRepository,
    content as BoardContentRepository,
  );
}

describe('BoardCommandsService.createColumn', () => {
  it('appends the column for OWNER/EDITOR and builds ColumnCreated with the new version', async () => {
    const addColumn = vi.fn(async (write: NewColumn) => {
      const events = write.toEvents(column, 7);
      expect(events[0]).toMatchObject({
        topic: BOARD_EVENTS_TOPIC,
        key: 'board-1',
        eventType: COLUMN_CREATED,
      });
      expect(JSON.parse(events[0].event)).toMatchObject({
        version: 7,
        payload: {
          boardId: 'board-1',
          columnId: 'column-1',
          title: 'To do',
          position: 'a0',
        },
      });
      return { status: 'ok', value: column } as BoardWriteResult<BoardColumn>;
    });

    await expect(
      contentService({ addColumn }).createColumn(user, 'board-1', {
        title: 'To do',
      }),
    ).resolves.toBe(column);

    expect(addColumn).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'board-1',
        userId: 'user-1',
        allowedRoles: [BoardRole.OWNER, BoardRole.EDITOR],
        column: { id: expect.any(String), title: 'To do' },
      }),
    );
  });

  it.each([
    ['forbidden', ForbiddenException],
    ['not_found', NotFoundException],
  ] as const)('maps %s to an HTTP error', async (status, error) => {
    const addColumn = vi.fn(
      async () => ({ status }) as BoardWriteResult<BoardColumn>,
    );

    await expect(
      contentService({ addColumn }).createColumn(user, 'board-1', {
        title: 'To do',
      }),
    ).rejects.toThrow(error);
  });
});

describe('BoardCommandsService.createCard', () => {
  it('appends the card as the caller and builds CardCreated', async () => {
    const addCard = vi.fn(async (write: NewCard) => {
      const event = JSON.parse(write.toEvents(card, 3)[0].event);
      expect(event).toMatchObject({
        eventType: CARD_CREATED,
        aggregateId: 'board-1',
        version: 3,
        payload: {
          cardId: 'card-1',
          columnId: 'column-1',
          createdBy: 'user-1',
        },
      });
      return { status: 'ok', value: card } as BoardWriteResult<Card>;
    });

    await expect(
      contentService({ addCard }).createCard(user, 'board-1', 'column-1', {
        title: 'Fix bug',
        description: null,
      }),
    ).resolves.toBe(card);

    expect(addCard).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'column-1',
        card: {
          id: expect.any(String),
          title: 'Fix bug',
          description: null,
          createdBy: 'user-1',
        },
      }),
    );
  });
});
