import { defineTool } from "eve/tools";
import { z } from "zod";
import { isValidTimeZone } from "../../shared/time/zoned.js";
import { updateProfileRemote } from "../lib/self-internal.js";
import { NOT_SIGNED_IN, currentUserId } from "../lib/require-user.js";

// Note there is deliberately no `phoneNumber` field — see
// internalPatchProfileBodySchema in lib/schemas/profile.ts for why.

function localTimeIn(timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return undefined;
  }
}

/** A few plausible zones for a rejected value, so the reply can be useful. */
function suggestZones(input: string) {
  const needle = input.trim().toLowerCase().replace(/[\s_]+/gu, "");
  if (!needle) return [];
  return Intl.supportedValuesOf("timeZone")
    .filter((zone) => zone.toLowerCase().replace(/[\s_/]+/gu, "").includes(needle))
    .slice(0, 5);
}

export default defineTool({
  description:
    "Update the user's own profile: timezone, language, display name, or bio. " +
    "Use it when they say they've moved, are travelling, want to be called something else, " +
    "or that you've got a detail wrong. The timezone is what your sense of 'today' and every " +
    "date you pass to other tools is based on, so keep it right.",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe("IANA zone name, e.g. 'Europe/Istanbul'. Not an abbreviation and not a UTC offset."),
    locale: z
      .string()
      .min(2)
      .max(16)
      .optional()
      .describe("BCP-47 language tag, e.g. 'en', 'tr', 'fr'."),
    name: z.string().min(1).max(100).optional().describe("What they want to be called."),
    bio: z
      .string()
      .max(500)
      .optional()
      .describe("Short description of them. Replaces the existing bio entirely, so include it all."),
  }),
  async execute(input, ctx) {
    const userId = currentUserId(ctx);
    if (!userId) {
      return NOT_SIGNED_IN;
    }

    const patch = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as typeof input;

    if (Object.keys(patch).length === 0) {
      return { error: "Nothing to update — give me at least one field." };
    }

    // The stored schema only checks length, so an abbreviation like "GMT+3"
    // would save and then be silently swallowed by the fallback in
    // current-time.ts, leaving the clock quietly wrong.
    if (patch.timezone && !isValidTimeZone(patch.timezone)) {
      const suggestions = suggestZones(patch.timezone);
      return {
        error:
          `"${patch.timezone}" isn't an IANA timezone.` +
          (suggestions.length ? ` Did you mean ${suggestions.join(", ")}?` : ""),
      };
    }

    const profile = await updateProfileRemote(userId, patch);
    if (!profile) {
      return { error: "Couldn't save that just now. Try again in a moment." };
    }

    return {
      updated: Object.keys(patch),
      profile: {
        name: profile.name,
        timezone: profile.timezone,
        locale: profile.locale,
        bio: profile.bio,
      },
      // Echo it back concretely so the confirmation is checkable, not just "done".
      localTime: localTimeIn(profile.timezone),
    };
  },
});
