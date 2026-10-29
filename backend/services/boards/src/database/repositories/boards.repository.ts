import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { OutboxMessage } from '@app/common';
import type { DataSource } from 'typeorm';
import { BoardColumn } from '../entities/board-column.entity.js';
import { BoardMember, BoardRole } from '../entities/board-member.entity.js';
import { Board } from '../entities/board.entity.js';
import { Card } from '../entities/card.entity.js';
import { OutboxMessagesRepository } from './outbox-messages.repository.js';
import { UsersRepository, type UserProfile } from './users.repository.js';

export interface NewBoard {
  board: Pick<Board, 'id' | 'title' | 'description' | 'version'>;
  owner: UserProfile;
  /** Events describing the change; written to the outbox in the same transaction. */
  events: OutboxMessage[];
}

export interface MemberBoard {
  id: string;
  title: string;
  description: string | null;
  role: BoardRole;
  createdAt: Date;
}

export interface MemberBoardDetails {
  board: Board;
  role: BoardRole;
  /** Ordered by position. */
  columns: BoardColumn[];
  /** All cards of the board, ordered by position (group them by `columnId`). */
  cards: Card[];
}

/** Boards with their members; every write also stores its events in the outbox. */
@Injectable()
export class BoardsRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly users: UsersRepository,
    private readonly outbox: OutboxMessagesRepository,
  ) {}

  /** Creates the board with `owner` as OWNER, in one transaction with its events. */
  async createWithOwner({ board, owner, events }: NewBoard): Promise<Board> {
    return this.dataSource.transaction(async (manager) => {
      // The owner's row may not be projected from UserRegistered yet.
      await this.users.insertIfMissing(owner, manager);
      const saved = await manager.save(manager.create(Board, board));
      await manager.insert(BoardMember, {
        boardId: board.id,
        userId: owner.id,
        role: BoardRole.OWNER,
      });
      await this.outbox.add(events, manager);
      return saved;
    });
  }

  /** Boards the user is a member of (any role), newest first. */
  async findAllForMember(userId: string): Promise<MemberBoard[]> {
    return this.dataSource
      .createQueryBuilder(Board, 'board')
      .innerJoin(
        BoardMember,
        'member',
        'member.boardId = board.id AND member.userId = :userId',
        { userId },
      )
      .select('board.id', 'id')
      .addSelect('board.title', 'title')
      .addSelect('board.description', 'description')
      .addSelect('board.createdAt', 'createdAt')
      .addSelect('member.role', 'role')
      .orderBy('board.createdAt', 'DESC')
      .getRawMany<MemberBoard>();
  }

  /** The board with its columns and cards, or null if it doesn't exist or the user isn't a member. */
  async findDetailsForMember(
    boardId: string,
    userId: string,
  ): Promise<MemberBoardDetails | null> {
    const { manager } = this.dataSource;
    const member = await manager.findOneBy(BoardMember, { boardId, userId });
    if (!member) return null;

    const [board, columns, cards] = await Promise.all([
      manager.findOneByOrFail(Board, { id: boardId }),
      manager.find(BoardColumn, {
        where: { boardId },
        order: { position: 'ASC' },
      }),
      manager.find(Card, { where: { boardId }, order: { position: 'ASC' } }),
    ]);
    return { board, role: member.role, columns, cards };
  }
}
