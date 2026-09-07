import { z } from "zod";

export const phoneLinkQuerySchema = z.object({
  phoneNumber: z.coerce.string().trim().min(1, "phoneNumber is required"),
});

export const phoneLinkByUserQuerySchema = z.object({
  appUserId: z.coerce.string().trim().min(1, "appUserId is required"),
});
