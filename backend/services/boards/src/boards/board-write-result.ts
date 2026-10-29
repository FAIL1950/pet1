import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { BoardWriteResult } from '../database/repositories/board-write.js';

/**
 * The written value, or the HTTP error for a refused board write: 403 wrong role, 404 board or
 * item not visible, 422 unknown user, 409 already a member / the OWNER can't be changed.
 */
export function unwrapBoardWrite<T>(result: BoardWriteResult<T>): T {
  switch (result.status) {
    case 'ok':
      return result.value;
    case 'forbidden':
      throw new ForbiddenException('Insufficient board role');
    case 'not_found':
      throw new NotFoundException();
    case 'conflict':
      if (result.reason === 'user_not_found') {
        throw new UnprocessableEntityException({
          code: 'USER_NOT_FOUND',
          message: 'No user with this email',
        });
      }
      throw new ConflictException({
        code: result.reason === 'owner' ? 'OWNER' : 'ALREADY_MEMBER',
        message:
          result.reason === 'owner'
            ? "The board's OWNER can't be changed or removed"
            : 'Already a member of the board',
      });
  }
}
