import { authClient } from "./client";

// Backend services (boards, ...) don't read the session cookie: they verify a short-lived JWT
// issued by the auth service (`GET /api/auth/token`, 15 min) against its public keys.
// Browser-only: the token is fetched with the session cookie.

// Refresh this long before `exp`, so a token doesn't expire in flight.
const EXPIRY_MARGIN_MS = 60_000;

type CachedToken = { token: string; expiresAt: number };

let cached: CachedToken | null = null;
let pending: Promise<string | null> | null = null;
// Bumped by `clearAccessToken()`: a request started before it must not repopulate the cache.
let generation = 0;

function expiresAt(token: string): number {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp === "number" ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function fetchToken(): Promise<string | null> {
  const requestGeneration = generation;
  const { data, error } = await authClient.token();
  // Only a 401 means "signed out"; anything else (auth down, network) is not the user's state.
  if (error && error.status !== 401) throw new Error(`Access token request failed: ${error.status}`);
  const token = data?.token ?? null;
  // Cleared while in flight (sign-out, rejected token): hand the result to its callers, don't cache it.
  if (requestGeneration === generation) {
    cached = token ? { token, expiresAt: expiresAt(token) } : null;
  }
  return token;
}

/** Bearer token for backend API calls; `null` when signed out. Concurrent callers share one request. */
export async function getAccessToken(): Promise<string | null> {
  if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return cached.token;
  if (!pending) {
    const request = fetchToken().finally(() => {
      // A newer request may have replaced this one after `clearAccessToken()`.
      if (pending === request) pending = null;
    });
    pending = request;
  }
  return pending;
}

/** Forget the cached token (after sign-out, or when a service rejected it), including one in flight. */
export function clearAccessToken(): void {
  cached = null;
  pending = null;
  generation += 1;
}
