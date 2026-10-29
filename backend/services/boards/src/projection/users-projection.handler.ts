import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  USER_REGISTERED,
  type DomainEvent,
  type UserRegisteredEvent,
} from '@app/contracts';
import type { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity.js';

/**
 * Applies auth events to the local `users` projection. Every handler is idempotent, because
 * Kafka delivers at least once: re-applying an event leaves the projection unchanged.
 */
@Injectable()
export class UsersProjectionHandler {
  private readonly logger = new Logger(UsersProjectionHandler.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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
    await this.dataSource.manager.upsert(
      User,
      {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        image: payload.image ?? null,
      },
      ['id'],
    );
  }
}
