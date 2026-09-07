import { defineTool } from "eve/tools";
import { z } from "zod";
import { appOrigin } from "../lib/internal-api.js";
import { fetchThreadsRemote } from "../lib/self-internal.js";
import { NOT_SIGNED_IN, currentUserId } from "../lib/require-user.js";

const CHANNELS = ["web", "slack", "imessage"] as const;

export default defineTool({
  description:
    "List the user's past conversations by title and date, newest first. Use it for 'did we talk " +
    "about X', 'what were we working on last week', or to find a thread to link them back to. " +
    "It does NOT search what was said inside a conversation — only titles. If a title isn't " +
    "enough to answer, say so and give them the link.",
  inputSchema: z.object({
    contains: z
      .string()
      .optional()
      .describe("Case-insensitive substring to match against conversation titles."),
    channel: z
      .enum(CHANNELS)
      .optional()
      .describe("Only conversations from this channel."),
    since: z
      .string()
      .optional()
      .describe("YYYY-MM-DD. Only conversations updated on or after this date — resolve relative dates yourself."),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  async execute({ contains, channel, since, limit }, ctx) {
    const userId = currentUserId(ctx);
    if (!userId) {
      return NOT_SIGNED_IN;
    }

    const threads = await fetchThreadsRemote(userId);
    if (!threads) {
      return { error: "Couldn't read your conversation history right now." };
    }

    const sinceMs = since ? Date.parse(`${since}T00:00:00Z`) : undefined;
    if (since && Number.isNaN(sinceMs)) {
      return { error: `"${since}" isn't a valid YYYY-MM-DD date.` };
    }

    const needle = contains?.trim().toLowerCase();
    const matched = threads.filter((thread) => {
      if (channel && thread.channel !== channel) return false;
      if (sinceMs !== undefined && thread.updatedAt < sinceMs) return false;
      if (needle && !thread.title.toLowerCase().includes(needle)) return false;
      return true;
    });

    const origin = appOrigin();
    return {
      total: matched.length,
      // The underlying query is already capped, so this is a display cap only.
      threads: matched.slice(0, limit).map((thread) => ({
        title: thread.title,
        channel: thread.channel,
        updatedAt: new Date(thread.updatedAt).toISOString(),
        url: `${origin}/chat/${thread.id}`,
      })),
      titlesOnly: true,
    };
  },
});
