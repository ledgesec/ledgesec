import { z } from "zod";

export const DEMO_NAME_MAX = 80;
export const DEMO_HOST_MAX = 253;
export const DEMO_MESSAGE_MAX = 2000;

export const FIELD_NAME = "name";
export const FIELD_EMAIL = "email";
export const FIELD_HOST = "host";
export const FIELD_MESSAGE = "message";
export const FIELD_INTEREST = "interest";
export const FIELD_SENT = "sent";
export const DEMO_INTEREST_MAX = 40;

export const CONTACT_PATH = "/api/v1/contact";

export const NAME_ERROR = "Enter a name.";
export const EMAIL_ERROR = "Enter a valid email.";
export const HOST_ERROR = "Use a host name without spaces.";
export const MESSAGE_ERROR = "Say how the server reports.";

export const demoSchema = z.object({
  name: z.string().trim().min(1, NAME_ERROR).max(DEMO_NAME_MAX, NAME_ERROR),
  email: z.string().trim().pipe(z.email(EMAIL_ERROR)),
  host: z.string().trim().max(DEMO_HOST_MAX, HOST_ERROR).refine((value) => !/\s/.test(value), HOST_ERROR),
  message: z.string().trim().min(1, MESSAGE_ERROR).max(DEMO_MESSAGE_MAX, MESSAGE_ERROR),
  interest: z
    .string()
    .trim()
    .max(DEMO_INTEREST_MAX)
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .default(""),
});

export type DemoValues = z.infer<typeof demoSchema>;
