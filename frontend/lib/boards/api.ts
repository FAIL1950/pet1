import { clearAccessToken, getAccessToken } from "@/lib/auth/token";
import type {
  AddMemberValues,
  CreateBoardValues,
  CreateCardValues,
  CreateColumnValues,
} from "./schemas";
import type { BoardCard, BoardColumn, BoardMember, BoardRole, BoardSummary } from "./types";

export type BoardsApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "userNotFound"
  | "alreadyMember"
  | "validation"
  | "network"
  | "generic";

export class BoardsApiError extends Error {
  constructor(readonly code: BoardsApiErrorCode) {
    super(`Boards API request failed: ${code}`);
    this.name = "BoardsApiError";
  }
}

function errorCodeForStatus(status: number): BoardsApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  // Members: no registered user with that email / already a member (the UI never targets the OWNER).
  if (status === 422) return "userNotFound";
  if (status === 409) return "alreadyMember";
  if (status === 400) return "validation";
  return "generic";
}

// Same-origin: the k8s ingress routes `/api/boards` to the boards service, which authenticates
// the request by the auth service's JWT (not the session cookie).
async function boardsFetch(path: string, init: RequestInit): Promise<Response> {
  const send = async () => {
    const token = await getAccessToken();
    if (!token) throw new BoardsApiError("unauthorized");
    return fetch(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
  };

  try {
    const res = await send();
    if (res.status !== 401) return res;
    // The cached token may have been issued for a since-ended session: retry once with a fresh one.
    clearAccessToken();
    return await send();
  } catch (error) {
    if (error instanceof BoardsApiError) throw error;
    throw new BoardsApiError("network");
  }
}

/**
 * Sends a JSON request and returns the body (undefined for `204`); a status other than
 * `expected` becomes a `BoardsApiError`.
 */
async function boardsSend<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  expected: 200 | 201 | 204,
  body?: unknown,
): Promise<T> {
  const res = await boardsFetch(path, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (res.status !== expected) throw new BoardsApiError(errorCodeForStatus(res.status));
  return (expected === 204 ? undefined : await res.json()) as T;
}

const boardPath = (boardId: string) => `/api/boards/${encodeURIComponent(boardId)}`;
const columnPath = (boardId: string, columnId: string) =>
  `${boardPath(boardId)}/columns/${encodeURIComponent(columnId)}`;
const cardPath = (boardId: string, cardId: string) =>
  `${boardPath(boardId)}/cards/${encodeURIComponent(cardId)}`;

export async function createBoard(values: CreateBoardValues): Promise<{ boardId: string }> {
  const board = await boardsSend<BoardSummary>("POST", "/api/boards", 201, values);
  return { boardId: board.id };
}

// Column and card writes: OWNER/EDITOR only (`forbidden`), `notFound` for items of another board.

/** Appends a column to the board. */
export function createColumn(boardId: string, values: CreateColumnValues): Promise<BoardColumn> {
  return boardsSend("POST", `${boardPath(boardId)}/columns`, 201, values);
}

export function updateColumn(
  boardId: string,
  columnId: string,
  values: CreateColumnValues,
): Promise<BoardColumn> {
  return boardsSend("PATCH", columnPath(boardId, columnId), 200, values);
}

/** Places the column right after `afterColumnId` (null = first). */
export function moveColumn(
  boardId: string,
  columnId: string,
  afterColumnId: string | null,
): Promise<BoardColumn> {
  return boardsSend("POST", `${columnPath(boardId, columnId)}/move`, 200, { afterColumnId });
}

/** Deletes the column together with its cards. */
export function deleteColumn(boardId: string, columnId: string): Promise<void> {
  return boardsSend("DELETE", columnPath(boardId, columnId), 204);
}

/** Appends a card to the column. */
export function createCard(
  boardId: string,
  columnId: string,
  values: CreateCardValues,
): Promise<BoardCard> {
  return boardsSend("POST", `${columnPath(boardId, columnId)}/cards`, 201, values);
}

export function updateCard(
  boardId: string,
  cardId: string,
  values: CreateCardValues,
): Promise<BoardCard> {
  return boardsSend("PATCH", cardPath(boardId, cardId), 200, values);
}

/** Places the card in `columnId` right after `afterCardId` (null = first). */
export function moveCard(
  boardId: string,
  cardId: string,
  columnId: string,
  afterCardId: string | null,
): Promise<BoardCard> {
  return boardsSend("POST", `${cardPath(boardId, cardId)}/move`, 200, { columnId, afterCardId });
}

export function deleteCard(boardId: string, cardId: string): Promise<void> {
  return boardsSend("DELETE", cardPath(boardId, cardId), 204);
}

// Members: any member lists them; only the OWNER adds, changes roles and removes; members may leave.

const membersPath = (boardId: string) => `${boardPath(boardId)}/members`;
const memberPath = (boardId: string, userId: string) =>
  `${membersPath(boardId)}/${encodeURIComponent(userId)}`;

export function listMembers(boardId: string): Promise<BoardMember[]> {
  return boardsSend("GET", membersPath(boardId), 200);
}

/** Adds a registered user by email (`userNotFound` / `alreadyMember` otherwise). */
export function addMember(boardId: string, values: AddMemberValues): Promise<BoardMember> {
  return boardsSend("POST", membersPath(boardId), 201, values);
}

export function changeMemberRole(
  boardId: string,
  userId: string,
  role: Exclude<BoardRole, "OWNER">,
): Promise<BoardMember> {
  return boardsSend("PATCH", memberPath(boardId, userId), 200, { role });
}

/** Removes the member, or leaves the board when `userId` is the signed-in user. */
export function removeMember(boardId: string, userId: string): Promise<void> {
  return boardsSend("DELETE", memberPath(boardId, userId), 204);
}
