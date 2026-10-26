import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { signInUrl } from "@/lib/auth/redirect";

// Optimistic check only: it sees whether a session cookie exists, not whether it is valid.
// Pages still validate the session against the auth service (`requireSession` in lib/auth/session.ts).
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(new URL(signInUrl(`${pathname}${search}`), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/boards/:path*"],
};
