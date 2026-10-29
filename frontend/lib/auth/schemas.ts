import { z } from "zod";
import { requiredString, type ValidationKey } from "@/lib/validation";

// Mirrors Better Auth's default `minPasswordLength`; the server remains the final authority.
export const MIN_PASSWORD_LENGTH = 8;

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
