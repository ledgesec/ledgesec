import { z } from "zod";

export const DEMO_NAME_MAX = 80;
export const DEMO_HOST_MAX = 253;
export const DEMO_MESSAGE_MAX = 2000;

export const FIELD_NAME = "name";
export const FIELD_CHANNEL = "channel";
export const FIELD_REACH = "reach";
export const FIELD_HOST = "host";
export const FIELD_MESSAGE = "message";
export const FIELD_INTEREST = "interest";
export const FIELD_SENT = "sent";
export const DEMO_INTEREST_MAX = 40;
export const DEMO_REACH_MAX = 254;

export const CHANNEL_EMAIL = "email";
export const CHANNEL_TELEGRAM = "telegram";
export const CHANNEL_WHATSAPP = "whatsapp";
export const CHANNELS = [CHANNEL_EMAIL, CHANNEL_TELEGRAM, CHANNEL_WHATSAPP] as const;

export type Channel = (typeof CHANNELS)[number];

export const CONTACT_PATH = "/api/v1/contact";

export const NAME_ERROR = "Enter a name.";
export const CHANNEL_ERROR = "Choose email, Telegram, or WhatsApp.";
export const EMAIL_ERROR = "Enter a valid email.";
export const TELEGRAM_ERROR = "Enter a Telegram name or number.";
export const WHATSAPP_ERROR = "Enter a WhatsApp number.";
export const HOST_ERROR = "Use a host name without spaces.";
export const MESSAGE_ERROR = "Say how the server reports.";

const TELEGRAM_NAME = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/;
const PHONE = /^\+?[0-9][0-9 -]{6,18}$/;

const REACH_ERROR: Record<Channel, string> = {
  [CHANNEL_EMAIL]: EMAIL_ERROR,
  [CHANNEL_TELEGRAM]: TELEGRAM_ERROR,
  [CHANNEL_WHATSAPP]: WHATSAPP_ERROR,
};

export function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

function reachMatches(channel: Channel, value: string) {
  if (channel === CHANNEL_EMAIL) return z.email().safeParse(value).success && value.length <= DEMO_REACH_MAX;
  if (channel === CHANNEL_TELEGRAM) return TELEGRAM_NAME.test(value) || PHONE.test(value);
  return PHONE.test(value);
}

export const demoSchema = z
  .object({
    name: z.string().trim().min(1, NAME_ERROR).max(DEMO_NAME_MAX, NAME_ERROR),
    channel: z.string().trim(),
    reach: z.string().trim().max(DEMO_REACH_MAX),
    host: z.string().trim().max(DEMO_HOST_MAX, HOST_ERROR).refine((value) => !/\s/.test(value), HOST_ERROR),
    message: z.string().trim().min(1, MESSAGE_ERROR).max(DEMO_MESSAGE_MAX, MESSAGE_ERROR),
    interest: z
      .string()
      .trim()
      .max(DEMO_INTEREST_MAX)
      .regex(/^[a-z0-9-]*$/)
      .optional()
      .default(""),
  })
  .superRefine((value, ctx) => {
    if (!isChannel(value.channel)) {
      ctx.addIssue({ code: "custom", path: [FIELD_CHANNEL], message: CHANNEL_ERROR });
      return;
    }
    if (!reachMatches(value.channel, value.reach)) {
      ctx.addIssue({ code: "custom", path: [FIELD_REACH], message: REACH_ERROR[value.channel] });
    }
  });

export type DemoValues = z.infer<typeof demoSchema>;
