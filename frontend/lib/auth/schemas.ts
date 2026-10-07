import { z } from "zod";

// Mirrors Better Auth's default `minPasswordLength`; the server remains the final authority.
export const MIN_PASSWORD_LENGTH = 8;

// Error messages are keys under `AuthForm.validation` — schemas stay locale-agnostic and
// `FormTextField` translates them.
const VALIDATION_KEYS = ["required", "email", "passwordMin", "passwordMismatch"] as const;

export type ValidationKey = (typeof VALIDATION_KEYS)[number];

export function isValidationKey(message: string | undefined): message is ValidationKey {
  return (VALIDATION_KEYS as readonly string[]).includes(message ?? "");
}

const requiredString = z.string().trim().min(1, { error: "required" satisfies ValidationKey });
const email = requiredString.pipe(z.email({ error: "email" satisfies ValidationKey }));
const requiredPassword = z.string().min(1, { error: "required" satisfies ValidationKey });

export const signInSchema = z.object({
  email,
  password: requiredPassword,
});

export const signUpSchema = z
  .object({
    name: requiredString,
    email,
    password: requiredPassword.min(MIN_PASSWORD_LENGTH, {
      error: "passwordMin" satisfies ValidationKey,
    }),
    confirmPassword: requiredPassword,
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "passwordMismatch" satisfies ValidationKey,
    path: ["confirmPassword"],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
