import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { BoardMember, BoardRole } from '../entities/board-member.entity.js';
import { User } from '../entities/user.entity.js';
import {
  ALL_BOARD_ROLES,
  BoardWriteRunner,
  type BoardWrite,
  type BoardWriteResult,
} from './board-write.js';

/** A board member with the profile from the local `users` projection. */
export interface MemberProfile {
  userId: string;
  email: string;
  name: string;
  image: string | null;
  role: BoardRole;
  addedAt: Date;
}

/** Roles the OWNER can grant; there is exactly one OWNER per board. */
export type GrantableRole = BoardRole.EDITOR | BoardRole.VIEWER;

type MemberWrite<T> = Omit<BoardWrite<T>, 'allowedRoles'>;

export interface MemberAddition extends MemberWrite<MemberProfile> {
  /** Looked up in the `users` projection (Better Auth stores emails lowercased). */
  email: string;
  role: GrantableRole;
}

export interface MemberRoleChange extends MemberWrite<MemberProfile> {
  memberId: string;
  role: GrantableRole;
}

export interface MemberRemoval extends MemberWrite<BoardMember> {
  memberId: string;
}

const OWNER_ONLY = [BoardRole.OWNER];

function toProfile(member: BoardMember, user: User): MemberProfile {
  return {
    userId: member.userId,
    email: user.email,
    name: user.name,
    image: user.image,
    role: member.role,
    addedAt: member.addedAt,
  };
}

/**
 * Board membership. Writes run in `BoardWriteRunner`'s transaction; only the OWNER manages
 * members, any member may remove themselves (leave), and the OWNER can't be changed or removed.
 */
@Injectable()
export class BoardMembersRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly writer: BoardWriteRunner,
  ) {}

  /** Members in the order they joined (the OWNER first); null if `userId` isn't a member. */
  async findAllForMember(
    boardId: string,
    userId: string,
  ): Promise<MemberProfile[] | null> {
    const { manager } = this.dataSource;
    if (!(await manager.existsBy(BoardMember, { boardId, userId }))) {
      return null;
    }
    return manager
      .createQueryBuilder(BoardMember, 'member')
      .innerJoin(User, 'user', 'user.id = member.userId')
      .select('member.userId', 'userId')
      .addSelect('user.email', 'email')
      .addSelect('user.name', 'name')
      .addSelect('user.image', 'image')
      .addSelect('member.role', 'role')
      .addSelect('member.addedAt', 'addedAt')
      .where('member.boardId = :boardId', { boardId })
      .orderBy('member.addedAt', 'ASC')
      .getRawMany<MemberProfile>();
  }

  /** Adds a registered user by email; `user_not_found` / `already_member` otherwise. */
  addByEmail({
    email,
    role,
    ...write
  }: MemberAddition): Promise<BoardWriteResult<MemberProfile>> {
    return this.writer.run(
      { ...write, allowedRoles: OWNER_ONLY },
      async (manager) => {
        const user = await manager.findOneBy(User, { email });
        if (!user) return { status: 'conflict', reason: 'user_not_found' };
        if (await this.findMember(manager, write.boardId, user.id)) {
          return { status: 'conflict', reason: 'already_member' };
        }
        const member = await manager.save(
          manager.create(BoardMember, {
            boardId: write.boardId,
            userId: user.id,
            role,
          }),
        );
        return { status: 'ok', value: toProfile(member, user) };
      },
    );
  }

  changeRole({
    memberId,
    role,
    ...write
  }: MemberRoleChange): Promise<BoardWriteResult<MemberProfile>> {
    return this.writer.run(
      { ...write, allowedRoles: OWNER_ONLY },
      async (manager) => {
        const member = await this.findMember(manager, write.boardId, memberId);
        if (!member) return { status: 'not_found' };
        if (member.role === BoardRole.OWNER) {
          return { status: 'conflict', reason: 'owner' };
        }
        member.role = role;
        const saved = await manager.save(member);
        const user = await manager.findOneByOrFail(User, { id: memberId });
        return { status: 'ok', value: toProfile(saved, user) };
      },
    );
  }

  /** The OWNER removes a member, or a member removes themselves; returns the removed membership. */
  remove({
    memberId,
    ...write
  }: MemberRemoval): Promise<BoardWriteResult<BoardMember>> {
    return this.writer.run(
      { ...write, allowedRoles: ALL_BOARD_ROLES },
      async (manager, access) => {
        const member = await this.findMember(manager, write.boardId, memberId);
        if (!member) return { status: 'not_found' };
        if (member.role === BoardRole.OWNER) {
          return { status: 'conflict', reason: 'owner' };
        }
        if (access.role !== BoardRole.OWNER && memberId !== write.userId) {
          return { status: 'forbidden' };
        }
        await manager.delete(BoardMember, {
          boardId: write.boardId,
          userId: memberId,
        });
        return { status: 'ok', value: member };
      },
    );
  }

  private findMember(
    manager: EntityManager,
    boardId: string,
    userId: string,
  ): Promise<BoardMember | null> {
    return manager.findOneBy(BoardMember, { boardId, userId });
  }
}
