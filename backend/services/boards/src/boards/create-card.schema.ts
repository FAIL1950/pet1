import { z } from 'zod';

// Limits mirror the `cards.title varchar(500)` column and the frontend form.
export const CARD_TITLE_MAX_LENGTH = 500;
export const CARD_DESCRIPTION_MAX_LENGTH = 5000;

export const createCardSchema = z.object({
  title: z.string().trim().min(1).max(CARD_TITLE_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .max(CARD_DESCRIPTION_MAX_LENGTH)
    .optional()
    .transform((value) => value || null),
});

export type CreateCardInput = z.output<typeof createCardSchema>;
