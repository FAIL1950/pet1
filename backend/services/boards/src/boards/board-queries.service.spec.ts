import { NotFoundException } from '@nestjs/common';
import type { BoardsRepository } from '../database/repositories/boards.repository.js';
import { BoardQueriesService } from './board-queries.service.js';

describe('BoardQueriesService', () => {
  it('lists the boards of the user', async () => {
    const boards = [{ id: 'b-1' }];
    const findAllForMember = vi.fn().mockResolvedValue(boards);
    const service = new BoardQueriesService({
      findAllForMember,
    } as unknown as BoardsRepository);

    await expect(service.listForUser('user-1')).resolves.toBe(boards);
    expect(findAllForMember).toHaveBeenCalledWith('user-1');
  });

  it('throws 404 when the user is not a member', async () => {
    const service = new BoardQueriesService({
      findDetailsForMember: vi.fn().mockResolvedValue(null),
    } as unknown as BoardsRepository);

    await expect(service.getForUser('b-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
