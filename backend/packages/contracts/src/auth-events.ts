import type { DomainEvent } from './domain-event.js';

export const USER_REGISTERED = 'UserRegistered';

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name: string;
  /** Avatar URL (e.g. from Google); null for email sign-ups. */
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
}

/** Published to `auth.events` (key = userId) after a user is created via email sign-up or first OAuth sign-in. */
export type UserRegisteredEvent = DomainEvent<UserRegisteredPayload> & {
  eventType: typeof USER_REGISTERED;
  aggregateType: 'User';
};

export const EMAIL_VERIFICATION_REQUESTED = 'EmailVerificationRequested';

export interface EmailVerificationRequestedPayload {
  userId: string;
  email: string;
  name: string;
  /** Better Auth's verification link; contains the token — never log it. */
  url: string;
}

/**
 * Published to `auth.events` (key = userId) when Better Auth wants a verification email sent
 * (sign-up, sign-in while unverified, or a resend); the notifications service delivers it.
 */
export type EmailVerificationRequestedEvent =
  DomainEvent<EmailVerificationRequestedPayload> & {
    eventType: typeof EMAIL_VERIFICATION_REQUESTED;
    aggregateType: 'User';
  };
