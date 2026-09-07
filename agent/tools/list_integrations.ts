import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchIntegrationsRemote } from "../lib/self-internal.js";
import { NOT_SIGNED_IN, currentUserId } from "../lib/require-user.js";

export default defineTool({
  description:
    "Check what this user is actually connected to — their integrations (GitHub, etc.) and which " +
    "channels are linked (Slack, iMessage). Call it when they ask what you're connected to, or " +
    "right after a tool comes back 'not connected' so you can tell them exactly what to fix. " +
    "Do NOT call it speculatively: it makes live round trips and is slow.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const userId = currentUserId(ctx);
    if (!userId) {
      return NOT_SIGNED_IN;
    }

    const summary = await fetchIntegrationsRemote(userId);
    if (!summary) {
      return { error: "Couldn't check your integrations right now." };
    }

    return summary;
  },
});
