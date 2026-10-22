import { z } from "zod";

export const hostLabelSchema = z.object({
  label: z.string().trim().min(1, "Enter a name for this host.").max(64, "Use 64 characters or fewer."),
});

export const hostCollectorSchema = z.object({
  collector: z.string().refine((value) => value === "nginx", "Nginx is the connection available now."),
});

export type HostLabel = z.infer<typeof hostLabelSchema>;
