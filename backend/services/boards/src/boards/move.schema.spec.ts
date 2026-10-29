import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '@app/common';
import { moveCardSchema, moveColumnSchema } from './move.schema.js';

const ID = '5a0a3f3e-3b0a-4f6e-9a35-4a4f9a3a2b11';

describe('moveColumnSchema / moveCardSchema via ZodValidationPipe', () => {
  it('accepts a neighbour id or null', () => {
    const columns = new ZodValidationPipe(moveColumnSchema);
    expect(columns.transform({ afterColumnId: null })).toEqual({
      afterColumnId: null,
    });
    const cards = new ZodValidationPipe(moveCardSchema);
    expect(cards.transform({ columnId: ID, afterCardId: ID })).toEqual({
      columnId: ID,
      afterCardId: ID,
    });
  });

  it.each([
    [moveColumnSchema, {}],
    [moveColumnSchema, { afterColumnId: 'not-a-uuid' }],
    [moveCardSchema, { afterCardId: null }],
    [moveCardSchema, { columnId: 'x', afterCardId: null }],
  ])('rejects invalid bodies with 400 (%#)', (schema, body) => {
    expect(() => new ZodValidationPipe(schema).transform(body)).toThrow(
      BadRequestException,
    );
  });
});
