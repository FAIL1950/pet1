export type AuthErrorKey =
  | "invalidCredentials"
  | "emailNotVerified"
  | "emailAlreadyVerified"
  | "userExists"
  | "invalidEmail"
  | "passwordTooShort"
  | "passwordTooLong"
  | "network"
  | "generic";

type AuthClientError = {
  status: number;
  code?: string;
};

const ERROR_CODE_KEYS: Record<string, AuthErrorKey> = {
  INVALID_EMAIL_OR_PASSWORD: "invalidCredentials",
  // Sign-in with an unverified email; Better Auth has just sent a new link (sendOnSignIn).
  EMAIL_NOT_VERIFIED: "emailNotVerified",
  // Resend for an address that is already verified.
  EMAIL_ALREADY_VERIFIED: "emailAlreadyVerified",
  USER_ALREADY_EXISTS: "userExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "userExists",
  INVALID_EMAIL: "invalidEmail",
  PASSWORD_TOO_SHORT: "passwordTooShort",
  PASSWORD_TOO_LONG: "passwordTooLong",
};

// Maps a Better Auth client error to a key under the `AuthForm.errors` messages.
// `null` means the request itself failed (backend unreachable, CORS) — better-fetch throws in that case.
export function authErrorKey(error: AuthClientError | null): AuthErrorKey {
  if (!error) return "network";
  if (error.code && error.code in ERROR_CODE_KEYS) return ERROR_CODE_KEYS[error.code];
  return "generic";
}
