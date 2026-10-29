import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { KafkaProducerService, type AuthUser } from '@app/common';
import {
  BOARD_CREATED,
  BOARD_EVENTS_TOPIC,
  type BoardCreatedEvent,
} from '@app/contracts';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Repository } from 'typeorm';
import { Board } from '../database/entities/board.entity.js';
import type { CreateBoardInput } from './create-board.schema.js';

/** How long a command waits for the projection to apply its event before answering 202. */
export const PROJECTION_WAIT_TIMEOUT_MS = 5000;
export const PROJECTION_POLL_INTERVAL_MS = 100;

export type CreateBoardResult =
  { status: 'created'; board: Board } | { status: 'pending'; boardId: string };

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
 * Board commands: validated input becomes an event in `board.events` (the source of truth);
 * the projection consumer writes Postgres. Commands never write the projection themselves.
 */
@Injectable()
export class BoardCommandsService {
  constructor(
    private readonly kafka: KafkaProducerService,
    @InjectRepository(Board) private readonly boards: Repository<Board>,
  ) {}

  async createBoard(
    user: AuthUser,
    input: CreateBoardInput,
  ): Promise<CreateBoardResult> {
    const boardId = randomUUID();
    await this.kafka.publish(
      BOARD_EVENTS_TOPIC,
      toBoardCreatedEvent(boardId, user, input),
    );

    // Read-your-writes for the caller: usually the projection catches up within milliseconds.
    const board = await this.waitForBoard(boardId);
    return board
      ? { status: 'created', board }
      : { status: 'pending', boardId };
  }

  private async waitForBoard(boardId: string): Promise<Board | null> {
    const deadline = Date.now() + PROJECTION_WAIT_TIMEOUT_MS;
    for (;;) {
      const board = await this.boards.findOneBy({ id: boardId });
      if (board || Date.now() >= deadline) return board;
      await sleep(PROJECTION_POLL_INTERVAL_MS);
    }
  }
}
