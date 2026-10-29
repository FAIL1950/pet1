// Response shapes of the boards service (`backend/services/boards/src/boards/board.dto.ts`).

export type BoardRole = "OWNER" | "EDITOR" | "VIEWER";

/** A board as listed for its member (`GET /api/boards`, `201` of `POST /api/boards`). */
export type BoardSummary = {
  id: string;
  title: string;
  description: string | null;
  role: BoardRole;
  createdAt: string;
};

export type BoardCard = {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: string;
};

export type BoardColumn = {
  id: string;
  title: string;
  position: string;
};

export type BoardColumnWithCards = BoardColumn & {
  /** Ordered by position. */
  cards: BoardCard[];
};

/** `GET /api/boards/:boardId`. */
export type BoardDetails = BoardSummary & {
  version: number;
  /** Ordered by position. */
  columns: BoardColumnWithCards[];
};

/** `GET /api/boards/:boardId/members`, the OWNER first. */
export type BoardMember = {
  userId: string;
  email: string;
  name: string;
  image: string | null;
  role: BoardRole;
  addedAt: string;
};

/** Roles that may add columns and cards; the server enforces the same rule. */
export function canEditContent(role: BoardRole): boolean {
  return role === "OWNER" || role === "EDITOR";
}
