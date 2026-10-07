import { createAuthClient } from "better-auth/react";

// Better Auth runs in the backend `auth` service. Behind the ingress it shares the frontend's origin
// (`/api/auth`), so no baseURL is needed; NEXT_PUBLIC_AUTH_URL overrides it for dev without the ingress.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
});

export type SocialProvider = "google";

export const AFTER_AUTH_REDIRECT = "/boards";
