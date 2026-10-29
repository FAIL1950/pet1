import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { OutboxMessage } from '@app/common';
import type { DataSource, EntityManager } from 'typeorm';
import { BoardMember, BoardRole } from '../entities/board-member.entity.js';
import { Board } from '../entities/board.entity.js';
import { OutboxMessagesRepository } from './outbox-messages.repository.js';

/** Why a write was refused although the caller may write to the board. */
export type BoardWriteConflict = 'user_not_found' | 'already_member' | 'owner';

/** Outcome of a board write: access is checked under the board's row lock. */
export type BoardWriteResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'conflict'; reason: BoardWriteConflict };

/** The caller's membership, read under the lock. */
export interface BoardAccess {
  role: BoardRole;
}

export interface BoardWrite<T> {
  boardId: string;
  userId: string;
  /** Roles that may perform the write; other members get `forbidden`, non-members `not_found`. */
  allowedRoles: readonly BoardRole[];
  /** Builds the events from the written value and the board's new version. */
  toEvents: (written: T, version: number) => OutboxMessage[];
}

export const ALL_BOARD_ROLES = Object.values(BoardRole);

/** `ok` with the value, or `not_found` for null. */
export function found<T>(value: T | null): BoardWriteResult<T> {
  return value === null ? { status: 'not_found' } : { status: 'ok', value };
}

/**
 * The transaction every board write runs in: lock the board row (serializes writes to one
 * board) joined with the caller's membership, check the role, apply the change, and only if it
 * succeeded bump `boards.version` and store the events in the outbox. Used by the repositories
 * that change a board; not by services directly.
 */
@Injectable()
export class BoardWriteRunner {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly outbox: OutboxMessagesRepository,
  ) {}

  run<T>(
    { boardId, userId, allowedRoles, toEvents }: BoardWrite<T>,
    change: (
      manager: EntityManager,
      access: BoardAccess,
    ) => Promise<BoardWriteResult<T>>,
  ): Promise<BoardWriteResult<T>> {
    return this.dataSource.transaction(async (manager) => {
      const access = await manager
        .createQueryBuilder(Board, 'board')
        .innerJoin(
          BoardMember,
          'member',
          'member.boardId = board.id AND member.userId = :userId',
          { userId },
        )
        .select('board.version', 'version')
        .addSelect('member.role', 'role')
        .where('board.id = :boardId', { boardId })
        .setLock('pessimistic_write', undefined, ['board'])
        .getRawOne<{ version: number; role: BoardRole }>();
      if (!access) return { status: 'not_found' };
      if (!allowedRoles.includes(access.role)) return { status: 'forbidden' };

      const result = await change(manager, { role: access.role });
      if (result.status !== 'ok') return result;

      const version = access.version + 1;
      await manager.update(Board, { id: boardId }, { version });
      await this.outbox.add(toEvents(result.value, version), manager);
      return result;
    });
  }
}
