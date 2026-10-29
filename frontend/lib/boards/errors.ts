import { BoardsApiError, type BoardsApiErrorCode } from "./api";

/** Keys under the `BoardsApiErrors` messages. */
export type BoardsApiErrorKey = Exclude<BoardsApiErrorCode, "validation">;

/**
 * Message key for a failed boards API call. Client-side validation mirrors the backend, so a 400
 * is unexpected and shown as the generic error, like anything that isn't a `BoardsApiError`.
 */
export function boardsApiErrorKey(error: unknown): BoardsApiErrorKey {
  if (!(error instanceof BoardsApiError) || error.code === "validation") return "generic";
  return error.code;
}
