import { z } from "zod";

export const patchProfileBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
  bio: z.string().trim().max(500).optional(),
  phoneNumber: z.string().trim().max(20).nullable().optional(),
});

/**
 * The agent-facing subset. Deliberately omits `phoneNumber`: updateProfileForUser
 * routes it through upsert/deletePhoneLinkForAppUser, so one mistyped digit from
 * a model would silently disconnect the iMessage channel it is talking on.
 */
export const internalPatchProfileBodySchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  name: z.string().trim().min(1).max(100).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
  bio: z.string().trim().max(500).optional(),
});
