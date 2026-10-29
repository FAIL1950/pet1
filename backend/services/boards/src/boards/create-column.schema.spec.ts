import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '@app/common';
import {
  COLUMN_TITLE_MAX_LENGTH,
  createColumnSchema,
} from './create-column.schema.js';

describe('createColumnSchema via ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(createColumnSchema);

  it('trims the title', () => {
    expect(pipe.transform({ title: '  To do ' })).toEqual({ title: 'To do' });
  });

  it.each([
    ['missing title', {}],
    ['blank title', { title: '   ' }],
    ['too long title', { title: 'x'.repeat(COLUMN_TITLE_MAX_LENGTH + 1) }],
  ])('rejects %s with 400', (_case, body) => {
    expect(() => pipe.transform(body)).toThrow(BadRequestException);
  });
});
