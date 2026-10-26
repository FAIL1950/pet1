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
