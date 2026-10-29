import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '@app/common';
import {
  CARD_DESCRIPTION_MAX_LENGTH,
  CARD_TITLE_MAX_LENGTH,
  createCardSchema,
} from './create-card.schema.js';

describe('createCardSchema via ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(createCardSchema);

  it('trims input and turns an empty description into null', () => {
    expect(pipe.transform({ title: ' Fix bug ', description: '  ' })).toEqual({
      title: 'Fix bug',
      description: null,
    });
  });

  it.each([
    ['blank title', { title: '   ' }],
    ['too long title', { title: 'x'.repeat(CARD_TITLE_MAX_LENGTH + 1) }],
    [
      'too long description',
      { title: 'a', description: 'x'.repeat(CARD_DESCRIPTION_MAX_LENGTH + 1) },
    ],
  ])('rejects %s with 400', (_case, body) => {
    expect(() => pipe.transform(body)).toThrow(BadRequestException);
  });
});
