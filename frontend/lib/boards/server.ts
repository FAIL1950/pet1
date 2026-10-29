import { cache } from "react";
import { getServerAccessToken } from "@/lib/auth/session";
import type { BoardDetails, BoardSummary } from "./types";

// Server Components can't use the browser origin, so they call the `boards` Service directly;
// override for dev without k8s.
const BOARDS_INTERNAL_URL = process.env.BOARDS_INTERNAL_URL ?? "http://boards";

/** Server-side GET against the boards service; `null` for 404 (missing board or not a member). */
async function boardsGet<T>(path: string): Promise<T | null> {
  const token = await getServerAccessToken();
  if (!token) throw new Error("No access token for the boards service");

  const res = await fetch(`${BOARDS_INTERNAL_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // 400 = malformed board id in the URL: as good as missing.
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Boards service request failed: ${res.status} ${path}`);
  return (await res.json()) as T;
}

/** Boards the signed-in user is a member of, newest first. */
export async function fetchBoards(): Promise<BoardSummary[]> {
  return (await boardsGet<BoardSummary[]>("/api/boards")) ?? [];
}

/**
 * The board with its columns and cards; `null` if it doesn't exist or the user isn't a member.
 * Deduplicated per request (generateMetadata and the page both load it).
 */
export const fetchBoard = cache(
  (boardId: string): Promise<BoardDetails | null> =>
    boardsGet<BoardDetails>(`/api/boards/${encodeURIComponent(boardId)}`),
);
