import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABELS,
  type MemoryCategory,
} from "../../shared/types/memory.js";
import { fetchUserContext } from "../lib/memory-internal.js";
import { NOT_SIGNED_IN, currentUserId } from "../lib/require-user.js";

// Reading memory back, which matters more than it looks.
//
// Memory is injected into the system prompt once at session.started (and per
// turn on iMessage, which re-injects). On web and Slack a long session that
// saved something two turns ago is reasoning off a stale block. And because
// save_memory REPLACES a whole category, "send the full updated text, not a
// delta" was impossible to actually satisfy without a way to read it first.

export default defineTool({
  description:
    "Read back what you have stored about this user — their profile and long-term memory, as the literal saved text. " +
    "Use it when they ask what you know or remember about them, and ALWAYS before save_memory when you are updating " +
    "an existing category, since saving replaces the whole category and you need the current text to build on.",
  inputSchema: z.object({
    category: z
      .enum(MEMORY_CATEGORIES)
      .optional()
      .describe("Limit to one category. Omit for everything, which is usually what you want."),
  }),
  async execute({ category }, ctx) {
    const userId = currentUserId(ctx);
    if (!userId) {
      return NOT_SIGNED_IN;
    }

    const context = await fetchUserContext(userId);
    if (!context) {
      return { error: "Couldn't read your memory right now. Try again in a moment." };
    }

    const wanted: readonly MemoryCategory[] = category ? [category] : MEMORY_CATEGORIES;
    const entries = wanted.flatMap((key) => {
      // One row per category in practice — setMemoryForCategory replaces.
      const entry = context.memory[key]?.[0];
      if (!entry) return [];
      return [
        {
          category: key,
          label: MEMORY_CATEGORY_LABELS[key],
          content: entry.content,
          source: entry.source,
          updatedAt: new Date(entry.updatedAt).toISOString(),
        },
      ];
    });

    return {
      profile: {
        name: context.profile.name,
        timezone: context.profile.timezone,
        locale: context.profile.locale,
        bio: context.profile.bio,
      },
      memory: entries,
      empty: entries.length === 0,
    };
  },
});
