import { clearAccessToken, getAccessToken } from "@/lib/auth/token";
import type { CreateBoardValues, CreateCardValues, CreateColumnValues } from "./schemas";
import type { BoardCard, BoardColumn, BoardSummary } from "./types";

export type BoardsApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "notFound"
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

/** POSTs JSON and returns the `201` body; any other status becomes a `BoardsApiError`. */
async function boardsPost<T>(path: string, body: unknown): Promise<T> {
  const res = await boardsFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status !== 201) throw new BoardsApiError(errorCodeForStatus(res.status));
  return (await res.json()) as T;
}

export async function createBoard(values: CreateBoardValues): Promise<{ boardId: string }> {
  const board = await boardsPost<BoardSummary>("/api/boards", values);
  return { boardId: board.id };
}

/** Appends a column to the board (OWNER/EDITOR). */
export function createColumn(boardId: string, values: CreateColumnValues): Promise<BoardColumn> {
  return boardsPost(`/api/boards/${encodeURIComponent(boardId)}/columns`, values);
}

/** Appends a card to the column (OWNER/EDITOR). */
export function createCard(
  boardId: string,
  columnId: string,
  values: CreateCardValues,
): Promise<BoardCard> {
  return boardsPost(
    `/api/boards/${encodeURIComponent(boardId)}/columns/${encodeURIComponent(columnId)}/cards`,
    values,
  );
}
