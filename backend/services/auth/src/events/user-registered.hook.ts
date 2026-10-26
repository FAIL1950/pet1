import { Injectable, Logger } from '@nestjs/common';
import {
  AUTH_EVENTS_TOPIC,
  USER_REGISTERED,
  type UserRegisteredEvent,
} from '@app/contracts';
import { AfterCreate, DatabaseHook } from '@thallesp/nestjs-better-auth';
import type { User } from 'better-auth';
import { randomUUID } from 'node:crypto';
import { KafkaProducerService } from '../kafka/kafka-producer.service.js';

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

/**
 * Emits `UserRegistered` after Better Auth creates a user (email sign-up or first OAuth sign-in).
 *
 * Consistency window: the user row is committed before publishing, and a failed publish is only
 * logged — registration must not depend on downstream consumers (SPEC §5). Such a user gets no
 * event; a transactional outbox would close this gap.
 */
@DatabaseHook()
@Injectable()
export class UserRegisteredHook {
  private readonly logger = new Logger(UserRegisteredHook.name);

  constructor(private readonly kafka: KafkaProducerService) {}

  @AfterCreate('user')
  async onUserCreated(user: User): Promise<void> {
    const event = toUserRegisteredEvent(user);
    try {
      await this.kafka.publish(AUTH_EVENTS_TOPIC, event);
    } catch (error) {
      this.logger.error(
        `Failed to publish ${event.eventType} for user ${user.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
