import { z } from "zod";

/**
 * Zod schemas for the identity module's public forms. Validated at the
 * boundary of every server action and form (see ARCHITECTURE.md §3.7).
 */

const PASSWORD_MIN = 12;
const PASSWORD_MAX = 200;

/**
 * Registration form input. `confirmPassword` is a form-only field (not stored).
 * `consent` is a literal-`true` gate: the user must accept, and `registerAction`
 * records that acceptance (timestamp + policy version) on the user row for GDPR
 * (see `lib/consent.ts`). The refine enforces that the two password fields
 * match; the error is attached to `confirmPassword` so the form surfaces it on
 * the right field.
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Please enter your name")
      .max(100, "Name must be 100 characters or fewer"),
    email: z
      .string()
      .trim()
      .min(1, "Please enter your email")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX, `Password must be ${PASSWORD_MAX} characters or fewer`),
    confirmPassword: z.string(),
    consent: z.literal(true, {
      message: "You must accept the privacy policy and therapy disclaimer",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Login form input.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
