import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '@app/common';
import {
  BOARD_TITLE_MAX_LENGTH,
  createBoardSchema,
} from './create-board.schema.js';

describe('createBoardSchema via ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(createBoardSchema);

  it('trims input and turns an empty description into null', () => {
    expect(
      pipe.transform({ title: '  Sprint 1 ', description: '   ' }),
    ).toEqual({ title: 'Sprint 1', description: null });
    expect(pipe.transform({ title: 'Sprint 1' })).toEqual({
      title: 'Sprint 1',
      description: null,
    });
  });

  it.each([
    ['missing title', {}],
    ['blank title', { title: '   ' }],
    ['too long title', { title: 'x'.repeat(BOARD_TITLE_MAX_LENGTH + 1) }],
    ['non-object body', 'Sprint 1'],
  ])('rejects %s with 400', (_case, body) => {
    expect(() => pipe.transform(body)).toThrow(BadRequestException);
  });
});
