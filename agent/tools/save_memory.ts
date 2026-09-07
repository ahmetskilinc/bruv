import { defineTool } from "eve/tools";
import { z } from "zod";
import { approvalUserId, callerChannel, isScheduledTurn } from "../lib/approval.js";
import { profileSettingsUrl } from "../lib/sendblue.js";
import { MEMORY_CATEGORIES } from "../../shared/types/memory.js";
import { saveMemoryRemote } from "../lib/memory-internal.js";

const updateSchema = z.object({
  category: z.enum(MEMORY_CATEGORIES).describe("Memory category to update"),
  content: z
    .string()
    .min(1)
    .describe("Full replacement prose for this category (not a partial delta)"),
});

export default defineTool({
  description:
    "Propose saving memory updates. Requires one user approval for the whole batch. When several categories change, include every update in a single call — never parallel save_memory calls.",
  inputSchema: z.object({
    reason: z
      .string()
      .min(1)
      .describe("Brief explanation of why these updates are worth remembering"),
    updates: z
      .array(updateSchema)
      .min(1)
      .max(5)
      .describe("Category updates to save together"),
  }),
  // Enforced here rather than asked for in the prompt. A denial returned at
  // request time is synchronous: no input request is emitted, so the turn never
  // parks waiting for an approval nobody can see.
  approval: (ctx) => {
    if (!approvalUserId(ctx)) {
      return {
        type: "denied",
        reason:
          "Memory can only be saved for a signed-in account. Tell them to sign in at bruv.chat first.",
      };
    }

    // A scheduled run has nobody watching to approve, and skipping the gate
    // would let it write unapproved. Refuse instead.
    if (isScheduledTurn(ctx)) {
      return { type: "denied", reason: "Memory can't be saved from a scheduled run." };
    }

    if (callerChannel(ctx) === "sendblue") {
      return {
        type: "denied",
        reason: `Memory saves aren't available over iMessage — tell them to edit it at ${profileSettingsUrl()}, and don't try save_memory again in this thread.`,
      };
    }

    return "user-approval";
  },
  async execute({ updates }, ctx) {
    const userId = ctx.session.auth.current?.principalId;
    if (!userId) {
      throw new Error("Cannot save memory without an authenticated user");
    }

    const results = [];
    for (const update of updates) {
      const result = await saveMemoryRemote({
        userId,
        category: update.category,
        content: update.content,
      });
      results.push({ category: update.category, saved: result.saved });
    }

    return { results };
  },
});
