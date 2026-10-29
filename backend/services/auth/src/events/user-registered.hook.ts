import { Injectable } from '@nestjs/common';
import { toOutboxMessage } from '@app/common';
import {
  AUTH_EVENTS_TOPIC,
  USER_REGISTERED,
  type UserRegisteredEvent,
} from '@app/contracts';
import { BeforeCreate, DatabaseHook } from '@thallesp/nestjs-better-auth';
import type { DBAdapter, User } from 'better-auth';
import { randomUUID } from 'node:crypto';
import { OutboxMessagesRepository } from '../database/repositories/outbox-messages.repository.js';

export function toUserRegisteredEvent(user: User): UserRegisteredEvent {
  return {
    eventId: randomUUID(),
    eventType: USER_REGISTERED,
    aggregateId: user.id,
    aggregateType: 'User',
    version: 1,
    timestamp: new Date().toISOString(),
    payload: {
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image ?? null,
      emailVerified: user.emailVerified,
      createdAt: new Date(user.createdAt).toISOString(),
    },
  };
}

/** The part of Better Auth's endpoint context the hook needs. */
export interface HookContext {
  context: { adapter: DBAdapter };
}

/**
 * Writes `UserRegistered` to the outbox when Better Auth creates a user (email sign-up or first
 * OAuth sign-in); `OutboxRelay` publishes it to `auth.events`.
 *
 * A `before` hook, because Better Auth runs it inside the sign-up transaction (`after` hooks
 * run after commit), so the user row and the event commit or roll back together (see
 * `OutboxMessagesRepository`). The user id is assigned here, since the event needs it before
 * the insert. Were a user ever created outside a transaction, the outbox row would still be
 * written first, just not atomically.
 */
@DatabaseHook()
@Injectable()
export class UserRegisteredHook {
  constructor(private readonly outbox: OutboxMessagesRepository) {}

  @BeforeCreate('user')
  async onUserCreate(
    user: User & Record<string, unknown>,
    ctx: HookContext | null,
  ): Promise<{ data: User & Record<string, unknown> }> {
    const data = { ...user, id: (user as Partial<User>).id || randomUUID() };
    await this.outbox.add(
      toOutboxMessage(AUTH_EVENTS_TOPIC, toUserRegisteredEvent(data)),
      ctx?.context.adapter,
    );
    return { data };
  }
}
