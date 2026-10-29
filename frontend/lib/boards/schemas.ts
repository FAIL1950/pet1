import { z } from "zod";
import { requiredString, type ValidationKey } from "@/lib/validation";

// Mirror the boards DB columns (`boards.title varchar(200)`, `columns.title varchar(200)`,
// `cards.title varchar(500)`) and the backend schemas; the backend remains the final authority.
export const BOARD_TITLE_MAX_LENGTH = 200;
export const BOARD_DESCRIPTION_MAX_LENGTH = 1000;
export const COLUMN_TITLE_MAX_LENGTH = 200;
export const CARD_TITLE_MAX_LENGTH = 500;
export const CARD_DESCRIPTION_MAX_LENGTH = 5000;

const tooLong = { error: "tooLong" satisfies ValidationKey };

export const createBoardSchema = z.object({
  title: requiredString.max(BOARD_TITLE_MAX_LENGTH, tooLong),
  description: z.string().trim().max(BOARD_DESCRIPTION_MAX_LENGTH, tooLong),
});

export type CreateBoardValues = z.infer<typeof createBoardSchema>;

export const createColumnSchema = z.object({
  title: requiredString.max(COLUMN_TITLE_MAX_LENGTH, tooLong),
});

export type CreateColumnValues = z.infer<typeof createColumnSchema>;

export const createCardSchema = z.object({
  title: requiredString.max(CARD_TITLE_MAX_LENGTH, tooLong),
  description: z.string().trim().max(CARD_DESCRIPTION_MAX_LENGTH, tooLong),
});

export type CreateCardValues = z.infer<typeof createCardSchema>;
