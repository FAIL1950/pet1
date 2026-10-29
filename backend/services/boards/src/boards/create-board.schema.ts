import { z } from 'zod';

// Limits mirror the boards DB columns (`title varchar(200)`) and the frontend form.
export const BOARD_TITLE_MAX_LENGTH = 200;
export const BOARD_DESCRIPTION_MAX_LENGTH = 1000;

export const createBoardSchema = z.object({
  title: z.string().trim().min(1).max(BOARD_TITLE_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .max(BOARD_DESCRIPTION_MAX_LENGTH)
    .optional()
    .transform((value) => value || null),
});

export type CreateBoardInput = z.output<typeof createBoardSchema>;
