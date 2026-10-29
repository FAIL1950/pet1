import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { toOutboxMessage, type AuthUser } from '@app/common';
import {
  BOARD_CREATED,
  BOARD_EVENTS_TOPIC,
  type BoardCreatedEvent,
} from '@app/contracts';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import {
  BoardMember,
  BoardRole,
} from '../database/entities/board-member.entity.js';
import { Board } from '../database/entities/board.entity.js';
import { OutboxMessage } from '../database/entities/outbox-message.entity.js';
import { User } from '../database/entities/user.entity.js';
import type { CreateBoardInput } from './create-board.schema.js';

export function toBoardCreatedEvent(
  boardId: string,
  user: AuthUser,
  input: CreateBoardInput,
): BoardCreatedEvent {
  return {
    eventId: randomUUID(),
    eventType: BOARD_CREATED,
    aggregateId: boardId,
    aggregateType: 'Board',
    version: 1,
    timestamp: new Date().toISOString(),
    payload: {
      boardId,
      title: input.title,
      description: input.description,
      owner: {
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    },
  };
}

/**
 * Board commands: Postgres is the source of truth. Each command changes the board tables and
 * writes its event to `outbox` in one transaction; `OutboxRelay` publishes it to `board.events`.
 */
@Injectable()
export class BoardCommandsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createBoard(user: AuthUser, input: CreateBoardInput): Promise<Board> {
    const boardId = randomUUID();
    const event = toBoardCreatedEvent(boardId, user, input);

    return this.dataSource.transaction(async (manager) => {
      // The JWT claims fill a missing `users` row (UserRegistered not consumed yet);
      // UserRegistered stays authoritative for profile data.
      await manager
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        })
        .orIgnore()
        .execute();

      const board = await manager.save(
        manager.create(Board, {
          id: boardId,
          title: input.title,
          description: input.description,
          version: event.version,
        }),
      );
      await manager.insert(BoardMember, {
        boardId,
        userId: user.id,
        role: BoardRole.OWNER,
      });
      await manager.insert(
        OutboxMessage,
        toOutboxMessage(BOARD_EVENTS_TOPIC, event),
      );
      return board;
    });
  }
}
