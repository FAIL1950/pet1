import type { BoardColumn } from '../database/entities/board-column.entity.js';
import type { BoardRole } from '../database/entities/board-member.entity.js';
import type { Card } from '../database/entities/card.entity.js';
import type {
  MemberBoard,
  MemberBoardDetails,
} from '../database/repositories/boards.repository.js';

/** A board as listed for its member (`GET /api/boards`, `POST /api/boards`). */
export interface BoardResponse {
  id: string;
  title: string;
  description: string | null;
  role: BoardRole;
  createdAt: string;
}

export interface CardResponse {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: string;
}

export interface ColumnResponse {
  id: string;
  title: string;
  position: string;
}

export interface ColumnWithCardsResponse extends ColumnResponse {
  /** Ordered by position. */
  cards: CardResponse[];
}

/** `GET /api/boards/:boardId`. */
export interface BoardDetailsResponse extends BoardResponse {
  version: number;
  /** Ordered by position. */
  columns: ColumnWithCardsResponse[];
}

export function toBoardResponse(board: MemberBoard): BoardResponse {
  return {
    id: board.id,
    title: board.title,
    description: board.description,
    role: board.role,
    createdAt: board.createdAt.toISOString(),
  };
}

export function toColumnResponse(column: BoardColumn): ColumnResponse {
  return { id: column.id, title: column.title, position: column.position };
}

export function toCardResponse(card: Card): CardResponse {
  return {
    id: card.id,
    columnId: card.columnId,
    title: card.title,
    description: card.description,
    position: card.position,
  };
}

export function toBoardDetailsResponse({
  board,
  role,
  columns,
  cards,
}: MemberBoardDetails): BoardDetailsResponse {
  const cardsByColumn = new Map<string, CardResponse[]>();
  for (const card of cards) {
    const columnCards = cardsByColumn.get(card.columnId) ?? [];
    columnCards.push(toCardResponse(card));
    cardsByColumn.set(card.columnId, columnCards);
  }
  return {
    ...toBoardResponse({ ...board, role }),
    version: board.version,
    columns: columns.map((column) => ({
      ...toColumnResponse(column),
      cards: cardsByColumn.get(column.id) ?? [],
    })),
  };
}
