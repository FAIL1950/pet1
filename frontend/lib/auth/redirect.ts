// Kept free of `better-auth/react` imports: proxy.ts uses this module too.
export const AFTER_AUTH_REDIRECT = "/boards";

export const CALLBACK_URL_PARAM = "callbackURL";

// Only same-origin paths are allowed, otherwise `?callbackURL=https://evil.example` is an open redirect.
// `//host` and `/\host` are protocol-relative URLs in browsers, so they are rejected too.
export function safeCallbackPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return AFTER_AUTH_REDIRECT;
  }
  return value;
}

export function signInUrl(callbackPath?: string): string {
  if (!callbackPath) return "/auth/sign-in";
  return `/auth/sign-in?${new URLSearchParams({ [CALLBACK_URL_PARAM]: callbackPath })}`;
}

/** Where the email verification link lands (then `callbackPath`); Better Auth adds `?error=` on failure. */
export function verifiedUrl(callbackPath: string): string {
  return `/auth/verified?${new URLSearchParams({ [CALLBACK_URL_PARAM]: callbackPath })}`;
}

/** "Check your email" page for `email`, continuing to `callbackPath` once verified. */
export function checkEmailUrl(email: string, callbackPath: string): string {
  return `/auth/check-email?${new URLSearchParams({ email, [CALLBACK_URL_PARAM]: callbackPath })}`;
}
