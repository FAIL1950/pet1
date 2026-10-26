"use client";

import { useSearchParams } from "next/navigation";
import { CALLBACK_URL_PARAM, safeCallbackPath } from "./redirect";

// Where to go after signing in/up: the page the user was bounced from, or the boards list.
export function useAfterAuthRedirect(): string {
  return safeCallbackPath(useSearchParams().get(CALLBACK_URL_PARAM));
}
