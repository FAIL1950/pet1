import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { unwrapBoardWrite } from './board-write-result.js';

describe('unwrapBoardWrite', () => {
  it('returns the value of a successful write', () => {
    expect(unwrapBoardWrite({ status: 'ok', value: 42 })).toBe(42);
  });

  it.each([
    [{ status: 'forbidden' } as const, ForbiddenException],
    [{ status: 'not_found' } as const, NotFoundException],
    [
      { status: 'conflict', reason: 'user_not_found' } as const,
      UnprocessableEntityException,
    ],
    [
      { status: 'conflict', reason: 'already_member' } as const,
      ConflictException,
    ],
    [{ status: 'conflict', reason: 'owner' } as const, ConflictException],
  ])('maps %o to its HTTP error', (result, error) => {
    expect(() => unwrapBoardWrite(result)).toThrow(error);
  });
});
