import { z } from "zod";
import { requiredString, type ValidationKey } from "@/lib/validation";

// Mirror the boards DB columns (`title varchar(200)`); the backend remains the final authority.
export const BOARD_TITLE_MAX_LENGTH = 200;
export const BOARD_DESCRIPTION_MAX_LENGTH = 1000;

const tooLong = { error: "tooLong" satisfies ValidationKey };

export const createBoardSchema = z.object({
  title: requiredString.max(BOARD_TITLE_MAX_LENGTH, tooLong),
  description: z.string().trim().max(BOARD_DESCRIPTION_MAX_LENGTH, tooLong),
});

export type CreateBoardValues = z.infer<typeof createBoardSchema>;
