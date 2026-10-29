import { Injectable, Logger } from '@nestjs/common';
import {
  USER_REGISTERED,
  type DomainEvent,
  type UserRegisteredEvent,
} from '@app/contracts';
import { UsersRepository } from '../database/repositories/users.repository.js';

/**
 * Applies auth events to the local `users` projection. Every handler is idempotent, because
 * Kafka delivers at least once: re-applying an event leaves the projection unchanged.
 */
@Injectable()
export class UsersProjectionHandler {
  private readonly logger = new Logger(UsersProjectionHandler.name);

  constructor(private readonly users: UsersRepository) {}

  async apply(event: DomainEvent<unknown>): Promise<void> {
    switch (event.eventType) {
      case USER_REGISTERED:
        await this.onUserRegistered(event as UserRegisteredEvent);
        return;
      default:
        this.logger.debug(`Ignoring ${event.eventType} (${event.eventId})`);
    }
  }

  private async onUserRegistered({
    payload,
  }: UserRegisteredEvent): Promise<void> {
    await this.users.upsert({
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      image: payload.image ?? null,
    });
  }
}
