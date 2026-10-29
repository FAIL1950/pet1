import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BOARD_CREATED,
  USER_REGISTERED,
  type BoardCreatedEvent,
  type DomainEvent,
  type UserRegisteredEvent,
} from '@app/contracts';
import type { DataSource, EntityManager } from 'typeorm';
import {
  BoardMember,
  BoardRole,
} from '../database/entities/board-member.entity.js';
import { Board } from '../database/entities/board.entity.js';
import { User } from '../database/entities/user.entity.js';

/**
 * Applies events to the boards projection. Every handler is idempotent, because Kafka
 * delivers at least once: re-applying an event leaves the projection unchanged.
 */
@Injectable()
export class ProjectionHandler {
  private readonly logger = new Logger(ProjectionHandler.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async apply(event: DomainEvent<unknown>): Promise<void> {
    switch (event.eventType) {
      case USER_REGISTERED:
        await this.dataSource.transaction((manager) =>
          this.onUserRegistered(manager, event as UserRegisteredEvent),
        );
        return;
      case BOARD_CREATED:
        await this.dataSource.transaction((manager) =>
          this.onBoardCreated(manager, event as BoardCreatedEvent),
        );
        return;
      default:
        this.logger.debug(`Ignoring ${event.eventType} (${event.eventId})`);
    }
  }

  private async onUserRegistered(
    manager: EntityManager,
    { payload }: UserRegisteredEvent,
  ): Promise<void> {
    await manager.upsert(
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

  private async onBoardCreated(
    manager: EntityManager,
    { payload, version }: BoardCreatedEvent,
  ): Promise<void> {
    const { owner } = payload;

    // The snapshot only fills a missing row; UserRegistered stays authoritative for profile data.
    await manager
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({
        id: owner.userId,
        email: owner.email,
        name: owner.name,
        image: owner.image,
      })
      .orIgnore()
      .execute();

    await manager
      .createQueryBuilder()
      .insert()
      .into(Board)
      .values({
        id: payload.boardId,
        title: payload.title,
        description: payload.description,
        version,
      })
      .orIgnore()
      .execute();

    await manager
      .createQueryBuilder()
      .insert()
      .into(BoardMember)
      .values({
        boardId: payload.boardId,
        userId: owner.userId,
        role: BoardRole.OWNER,
      })
      .orIgnore()
      .execute();
  }
}
