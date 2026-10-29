import { z } from 'zod';

// Mirrors the `columns.title varchar(200)` column and the frontend form.
export const COLUMN_TITLE_MAX_LENGTH = 200;

export const createColumnSchema = z.object({
  title: z.string().trim().min(1).max(COLUMN_TITLE_MAX_LENGTH),
});

export type CreateColumnInput = z.output<typeof createColumnSchema>;
