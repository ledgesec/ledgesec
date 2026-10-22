import { z } from "zod";

export const hostLabelSchema = z.object({
  label: z.string().trim().min(1, "Enter a name for this host.").max(64, "Use 64 characters or fewer."),
});

export const hostCollectorSchema = z.object({
  collector: z.string().refine((value) => value === "nginx" || value === "linux", "Nginx and the Linux daemon can be added now."),
});

export const hostOwnerSchema = z.object({
  ownerId: z.string().trim().min(1, "Choose the account that owns this host."),
});
