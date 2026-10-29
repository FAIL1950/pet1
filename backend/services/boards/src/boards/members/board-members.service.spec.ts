import { NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@app/common';
import {
  BOARD_MEMBER_ADDED,
  BOARD_MEMBER_REMOVED,
  BOARD_MEMBER_ROLE_CHANGED,
} from '@app/contracts';
import { BoardRole } from '../../database/entities/board-member.entity.js';
import type {
  BoardMembersRepository,
  MemberProfile,
} from '../../database/repositories/board-members.repository.js';
import { BoardMembersService } from './board-members.service.js';

const owner: AuthUser = {
  id: 'owner-1',
  email: 'a@example.com',
  name: 'Alice',
  image: null,
};

const bob: MemberProfile = {
  userId: 'bob-1',
  email: 'bob@example.com',
  name: 'Bob',
  image: null,
  role: BoardRole.VIEWER,
  addedAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** Calls `toEvents` like the repository would and returns the parsed event. */
function eventOf(
  write: { toEvents: (w: never, v: number) => { event: string }[] },
  written: unknown,
) {
  return JSON.parse(write.toEvents(written as never, 6)[0].event);
}

describe('BoardMembersService', () => {
  it('lists members, 404 for non-members', async () => {
    const findAllForMember = vi
      .fn()
      .mockResolvedValueOnce([bob])
      .mockResolvedValueOnce(null);
    const service = new BoardMembersService({
      findAllForMember,
    } as unknown as BoardMembersRepository);

    await expect(service.list(owner, 'b-1')).resolves.toEqual([bob]);
    await expect(service.list(owner, 'b-1')).rejects.toThrow(NotFoundException);
  });

  it('adds a member by email and emits BoardMemberAdded', async () => {
    const addByEmail = vi.fn(async (write) => {
      expect(eventOf(write, bob)).toMatchObject({
        eventType: BOARD_MEMBER_ADDED,
        aggregateId: 'b-1',
        version: 6,
        payload: { boardId: 'b-1', userId: 'bob-1', role: 'VIEWER' },
      });
      return { status: 'ok', value: bob };
    });
    const service = new BoardMembersService({
      addByEmail,
    } as unknown as BoardMembersRepository);

    await expect(
      service.add(owner, 'b-1', {
        email: 'bob@example.com',
        role: BoardRole.VIEWER,
      }),
    ).resolves.toBe(bob);
    expect(addByEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'b-1',
        userId: 'owner-1',
        email: 'bob@example.com',
        role: BoardRole.VIEWER,
      }),
    );
  });

  it('changes a role and emits BoardMemberRoleChanged', async () => {
    const editor = { ...bob, role: BoardRole.EDITOR };
    const changeRole = vi.fn(async (write) => {
      expect(eventOf(write, editor)).toMatchObject({
        eventType: BOARD_MEMBER_ROLE_CHANGED,
        payload: { userId: 'bob-1', role: 'EDITOR' },
      });
      return { status: 'ok', value: editor };
    });
    const service = new BoardMembersService({
      changeRole,
    } as unknown as BoardMembersRepository);

    await expect(
      service.changeRole(owner, 'b-1', 'bob-1', { role: BoardRole.EDITOR }),
    ).resolves.toBe(editor);
  });

  it('removes a member and emits BoardMemberRemoved', async () => {
    const remove = vi.fn(async (write) => {
      expect(
        eventOf(write, {
          boardId: 'b-1',
          userId: 'bob-1',
          role: BoardRole.VIEWER,
        }),
      ).toMatchObject({
        eventType: BOARD_MEMBER_REMOVED,
        payload: { boardId: 'b-1', userId: 'bob-1' },
      });
      return { status: 'ok', value: {} };
    });
    const service = new BoardMembersService({
      remove,
    } as unknown as BoardMembersRepository);

    await service.remove(owner, 'b-1', 'bob-1');
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'b-1',
        userId: 'owner-1',
        memberId: 'bob-1',
      }),
    );
  });
});
