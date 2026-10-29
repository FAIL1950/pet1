import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BoardsRepository,
  type MemberBoard,
  type MemberBoardDetails,
} from '../database/repositories/boards.repository.js';

/** Read side of boards: only boards the user is a member of are visible. */
@Injectable()
export class BoardQueriesService {
  constructor(private readonly boards: BoardsRepository) {}

  listForUser(userId: string): Promise<MemberBoard[]> {
    return this.boards.findAllForMember(userId);
  }

  /** 404 for non-members too, so board ids don't leak. */
  async getForUser(
    boardId: string,
    userId: string,
  ): Promise<MemberBoardDetails> {
    const details = await this.boards.findDetailsForMember(boardId, userId);
    if (!details) throw new NotFoundException('Board not found');
    return details;
  }
}
