import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@app/common';
import {
  BoardMembersRepository,
  type MemberProfile,
} from '../../database/repositories/board-members.repository.js';
import {
  emit,
  toBoardMemberAddedEvent,
  toBoardMemberRemovedEvent,
  toBoardMemberRoleChangedEvent,
} from '../board-events.js';
import { unwrapBoardWrite } from '../board-write-result.js';
import type {
  AddMemberInput,
  ChangeMemberRoleInput,
} from './members.schema.js';

/**
 * Board membership: any member sees the list; only the OWNER adds members (by email of a
 * registered user), changes their role or removes them; any member may leave. Every change
 * publishes a `BoardMember…` event through the outbox.
 */
@Injectable()
export class BoardMembersService {
  constructor(private readonly members: BoardMembersRepository) {}

  /** 404 for non-members, so board ids don't leak. */
  async list(user: AuthUser, boardId: string): Promise<MemberProfile[]> {
    const members = await this.members.findAllForMember(boardId, user.id);
    if (!members) throw new NotFoundException('Board not found');
    return members;
  }

  async add(
    user: AuthUser,
    boardId: string,
    input: AddMemberInput,
  ): Promise<MemberProfile> {
    return unwrapBoardWrite(
      await this.members.addByEmail({
        boardId,
        userId: user.id,
        email: input.email,
        role: input.role,
        toEvents: emit((member: MemberProfile, version) =>
          toBoardMemberAddedEvent(boardId, member, version),
        ),
      }),
    );
  }

  async changeRole(
    user: AuthUser,
    boardId: string,
    memberId: string,
    input: ChangeMemberRoleInput,
  ): Promise<MemberProfile> {
    return unwrapBoardWrite(
      await this.members.changeRole({
        boardId,
        userId: user.id,
        memberId,
        role: input.role,
        toEvents: emit((member: MemberProfile, version) =>
          toBoardMemberRoleChangedEvent(boardId, member, version),
        ),
      }),
    );
  }

  /** Removes a member (OWNER) or leaves the board (`memberId` = the caller). */
  async remove(
    user: AuthUser,
    boardId: string,
    memberId: string,
  ): Promise<void> {
    unwrapBoardWrite(
      await this.members.remove({
        boardId,
        userId: user.id,
        memberId,
        toEvents: emit(toBoardMemberRemovedEvent),
      }),
    );
  }
}
