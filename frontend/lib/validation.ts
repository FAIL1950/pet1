import { z } from "zod";

// Error messages are keys under `Form.validation` — schemas stay locale-agnostic and
// `FormTextField` translates them.
const VALIDATION_KEYS = ["required", "tooLong", "email", "passwordMin", "passwordMismatch"] as const;

export type ValidationKey = (typeof VALIDATION_KEYS)[number];

export function isValidationKey(message: string | undefined): message is ValidationKey {
  return (VALIDATION_KEYS as readonly string[]).includes(message ?? "");
}

export const requiredString = z.string().trim().min(1, { error: "required" satisfies ValidationKey });
