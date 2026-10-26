import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInUrl } from "./redirect";

// Shape of Better Auth's `GET /api/auth/get-session` response (only the fields the frontend uses).
export type Session = {
  user: { id: string; email: string; name: string; image?: string | null };
  session: { id: string; expiresAt: string };
};

export type SessionUser = Session["user"];

// Server-side calls can't use the browser origin (http://localhost resolves to the pod itself),
// so they go straight to the `auth` Service; override for dev without k8s.
const AUTH_INTERNAL_URL = process.env.AUTH_INTERNAL_URL ?? "http://auth";

// Deduplicated per request, so pages and data loaders can all call it freely.
export const getSession = cache(async (): Promise<Session | null> => {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return null;
  try {
    const res = await fetch(`${AUTH_INTERNAL_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Session | null;
  } catch {
    return null;
  }
});

export async function requireSession(callbackPath?: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(signInUrl(callbackPath));
  return session;
}
