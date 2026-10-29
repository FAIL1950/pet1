import { z } from 'zod';

/** `POST /api/boards/:boardId/columns/:columnId/move`: place after a column, or first (null). */
export const moveColumnSchema = z.object({
  afterColumnId: z.uuid().nullable(),
});

export type MoveColumnInput = z.output<typeof moveColumnSchema>;

/** `POST /api/boards/:boardId/cards/:cardId/move`: target column and the card to follow (null = first). */
export const moveCardSchema = z.object({
  columnId: z.uuid(),
  afterCardId: z.uuid().nullable(),
});

export type MoveCardInput = z.output<typeof moveCardSchema>;
