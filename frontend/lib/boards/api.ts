import { clearAccessToken, getAccessToken } from "@/lib/auth/token";
import type { CreateBoardValues } from "./schemas";

export type BoardRole = "OWNER" | "EDITOR" | "VIEWER";

/** `201 Created` from `POST /api/boards`. */
export type BoardResponse = {
  id: string;
  title: string;
  description: string | null;
  role: BoardRole;
  createdAt: string;
};

export type BoardsApiErrorCode = "unauthorized" | "validation" | "network" | "generic";

export class BoardsApiError extends Error {
  constructor(readonly code: BoardsApiErrorCode) {
    super(`Boards API request failed: ${code}`);
    this.name = "BoardsApiError";
  }
}

function errorCodeForStatus(status: number): BoardsApiErrorCode {
  if (status === 401) return "unauthorized";
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

export async function createBoard(values: CreateBoardValues): Promise<{ boardId: string }> {
  const res = await boardsFetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (res.status === 201) {
    const board = (await res.json()) as BoardResponse;
    return { boardId: board.id };
  }
  throw new BoardsApiError(errorCodeForStatus(res.status));
}
