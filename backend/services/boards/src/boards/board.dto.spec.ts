import type { BoardColumn } from '../database/entities/board-column.entity.js';
import { BoardRole } from '../database/entities/board-member.entity.js';
import type { Board } from '../database/entities/board.entity.js';
import type { Card } from '../database/entities/card.entity.js';
import { toBoardDetailsResponse } from './board.dto.js';

describe('toBoardDetailsResponse', () => {
  it('nests cards under their columns, keeping both orders', () => {
    const board = {
      id: 'b-1',
      title: 'Sprint',
      description: null,
      version: 4,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    } as Board;
    const columns = [
      { id: 'c-1', title: 'To do', position: 'a0' },
      { id: 'c-2', title: 'Done', position: 'a1' },
    ] as BoardColumn[];
    const cards = [
      {
        id: 'k-1',
        columnId: 'c-1',
        title: 'A',
        description: null,
        position: 'a0',
      },
      {
        id: 'k-2',
        columnId: 'c-1',
        title: 'B',
        description: 'x',
        position: 'a1',
      },
    ] as Card[];

    expect(
      toBoardDetailsResponse({ board, role: BoardRole.EDITOR, columns, cards }),
    ).toEqual({
      id: 'b-1',
      title: 'Sprint',
      description: null,
      role: BoardRole.EDITOR,
      createdAt: '2026-01-01T00:00:00.000Z',
      version: 4,
      columns: [
        {
          id: 'c-1',
          title: 'To do',
          position: 'a0',
          cards: [
            {
              id: 'k-1',
              columnId: 'c-1',
              title: 'A',
              description: null,
              position: 'a0',
            },
            {
              id: 'k-2',
              columnId: 'c-1',
              title: 'B',
              description: 'x',
              position: 'a1',
            },
          ],
        },
        { id: 'c-2', title: 'Done', position: 'a1', cards: [] },
      ],
    });
  });
});
