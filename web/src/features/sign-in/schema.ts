import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email.")),
  password: z.string().min(1, "Enter a password."),
});

export type SignInValues = z.infer<typeof signInSchema>;
