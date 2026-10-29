import type { EntityManager } from 'typeorm';
import { BoardRole } from '../entities/board-member.entity.js';
import { BoardMembersRepository } from './board-members.repository.js';
import type { BoardWrite, BoardWriteRunner } from './board-write.js';

const addedAt = new Date('2026-01-01T00:00:00.000Z');
const users = {
  'owner-1': {
    id: 'owner-1',
    email: 'a@example.com',
    name: 'Alice',
    image: null,
  },
  'bob-1': { id: 'bob-1', email: 'bob@example.com', name: 'Bob', image: null },
};
const memberships = {
  'owner-1': {
    boardId: 'b-1',
    userId: 'owner-1',
    role: BoardRole.OWNER,
    addedAt,
  },
  'bob-1': { boardId: 'b-1', userId: 'bob-1', role: BoardRole.VIEWER, addedAt },
};

/** Runs the change directly as `callerRole`, recording which roles the write allowed. */
function setup(
  callerRole: BoardRole,
  members: Record<string, object> = memberships,
) {
  const allowed: (readonly BoardRole[])[] = [];
  const manager = {
    findOneBy: async (
      entity: { name: string },
      where: { id?: string; email?: string; userId?: string },
    ) => {
      if (entity.name === 'User') {
        const user = Object.values(users).find(
          (u) => u.id === where.id || u.email === where.email,
        );
        return user ?? null;
      }
      const member = where.userId ? members[where.userId] : undefined;
      return member ? { ...member } : null;
    },
    findOneByOrFail: async (
      _entity: unknown,
      where: { id: keyof typeof users },
    ) => users[where.id],
    create: (_entity: unknown, values: object) => values,
    save: async (values: object) => ({ addedAt, ...values }),
    delete: vi.fn(async () => undefined),
  } as unknown as EntityManager;
  const writer = {
    run: (
      write: BoardWrite<unknown>,
      change: (m: EntityManager, a: { role: BoardRole }) => unknown,
    ) => {
      allowed.push(write.allowedRoles);
      return change(manager, { role: callerRole });
    },
  } as unknown as BoardWriteRunner;
  const repository = new BoardMembersRepository({} as never, writer);
  return { repository, manager, allowed };
}

const write = { boardId: 'b-1', userId: 'owner-1', toEvents: () => [] };

describe('BoardMembersRepository.addByEmail', () => {
  it('adds a registered user (OWNER only)', async () => {
    const { repository, allowed } = setup(BoardRole.OWNER, {
      'owner-1': memberships['owner-1'],
    });

    await expect(
      repository.addByEmail({
        ...write,
        email: 'bob@example.com',
        role: BoardRole.EDITOR,
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: {
        userId: 'bob-1',
        email: 'bob@example.com',
        name: 'Bob',
        image: null,
        role: BoardRole.EDITOR,
        addedAt,
      },
    });
    expect(allowed).toEqual([[BoardRole.OWNER]]);
  });

  it('refuses unknown emails and existing members', async () => {
    const { repository } = setup(BoardRole.OWNER);

    await expect(
      repository.addByEmail({
        ...write,
        email: 'nobody@example.com',
        role: BoardRole.VIEWER,
      }),
    ).resolves.toEqual({ status: 'conflict', reason: 'user_not_found' });
    await expect(
      repository.addByEmail({
        ...write,
        email: 'bob@example.com',
        role: BoardRole.VIEWER,
      }),
    ).resolves.toEqual({ status: 'conflict', reason: 'already_member' });
  });
});

describe('BoardMembersRepository.changeRole', () => {
  it("changes a member's role, but never the OWNER's", async () => {
    const { repository, allowed } = setup(BoardRole.OWNER);

    await expect(
      repository.changeRole({
        ...write,
        memberId: 'bob-1',
        role: BoardRole.EDITOR,
      }),
    ).resolves.toMatchObject({
      status: 'ok',
      value: { userId: 'bob-1', role: BoardRole.EDITOR },
    });
    await expect(
      repository.changeRole({
        ...write,
        memberId: 'owner-1',
        role: BoardRole.VIEWER,
      }),
    ).resolves.toEqual({ status: 'conflict', reason: 'owner' });
    await expect(
      repository.changeRole({
        ...write,
        memberId: 'ghost',
        role: BoardRole.VIEWER,
      }),
    ).resolves.toEqual({ status: 'not_found' });
    expect(allowed[0]).toEqual([BoardRole.OWNER]);
  });
});

describe('BoardMembersRepository.remove', () => {
  it('lets the OWNER remove a member', async () => {
    const { repository, manager } = setup(BoardRole.OWNER);

    await expect(
      repository.remove({ ...write, memberId: 'bob-1' }),
    ).resolves.toMatchObject({ status: 'ok', value: { userId: 'bob-1' } });
    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), {
      boardId: 'b-1',
      userId: 'bob-1',
    });
  });

  it('lets a member leave, but not remove others', async () => {
    const { repository } = setup(BoardRole.VIEWER);

    await expect(
      repository.remove({ ...write, userId: 'bob-1', memberId: 'bob-1' }),
    ).resolves.toMatchObject({ status: 'ok' });
    await expect(
      repository.remove({ ...write, userId: 'carol-1', memberId: 'bob-1' }),
    ).resolves.toEqual({ status: 'forbidden' });
  });

  it('never removes the OWNER (not even by themselves)', async () => {
    const { repository } = setup(BoardRole.OWNER);

    await expect(
      repository.remove({ ...write, memberId: 'owner-1' }),
    ).resolves.toEqual({ status: 'conflict', reason: 'owner' });
  });
});
