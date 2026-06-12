import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((email) => email.toLowerCase());

const passwordSchema = z.string().min(8).max(128);

export const signupFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  redirectTo: z.string().optional(),
});

export const passwordResetRequestFormSchema = z.object({
  email: emailSchema,
});

export const passwordUpdateFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupFormSchema>;
export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type PasswordResetRequestFormValues = z.infer<
  typeof passwordResetRequestFormSchema
>;
export type PasswordUpdateFormValues = z.infer<typeof passwordUpdateFormSchema>;
