import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchPhoneLinkForUser } from "../lib/phone-internal.js";
import { isSendblueConfigured, profileSettingsUrl } from "../lib/sendblue.js";
import { sendImessageToNumber } from "../lib/sendblue-notify.js";
import { NOT_SIGNED_IN, currentUserId } from "../lib/require-user.js";

export default defineTool({
  description:
    "Text the user on iMessage at their linked number. Use it when they say 'text me that', or to " +
    "move something onto their phone that they'll want when they're away from the browser — an " +
    "itinerary, an address, a list. Send the FULL content, not a summary: it's delivered verbatim " +
    "and they won't see a follow-up. Don't use it if you're already talking to them on iMessage.",
  inputSchema: z.object({
    message: z
      .string()
      .min(1)
      .max(4000)
      .describe("Exactly what to send, as plain text. This is delivered word for word."),
  }),
  async execute({ message }, ctx) {
    const auth = ctx.session.auth.current;
    const userId = currentUserId(ctx);
    if (!userId) {
      return NOT_SIGNED_IN;
    }

    // The sendblue channel stamps this on its session auth; a tool ctx has no
    // channel of its own, so this is the only way to know where we already are.
    if (auth?.attributes?.channel === "sendblue") {
      return {
        sent: false,
        reason: "This conversation is already on iMessage — just reply here.",
      };
    }

    if (!isSendblueConfigured()) {
      return { sent: false, reason: "iMessage isn't set up on this deployment." };
    }

    const link = await fetchPhoneLinkForUser(userId);
    if (!link) {
      return {
        sent: false,
        reason: `No phone number linked yet. Tell them to add one at ${profileSettingsUrl()} in E.164 format.`,
      };
    }

    try {
      await sendImessageToNumber(link.phoneNumber, message);
    } catch (error) {
      console.error("[text_me] delivery failed", error);
      return { sent: false, reason: "iMessage delivery failed. Try again in a moment." };
    }

    return {
      sent: true,
      // Echoed back so this session retains what was sent — the iMessage
      // session will NOT have it in its history.
      message,
    };
  },
});
