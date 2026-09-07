import { defineDynamic, defineInstructions } from "eve/instructions";
import type { DynamicResolveContext } from "eve/instructions";
import { BASE_INSTRUCTIONS } from "./lib/base-instructions.js";
import { currentDatePrompt } from "./lib/current-time.js";
import { buildUserContextPrompt, fetchUserContext } from "./lib/memory-internal.js";

const IMESSAGE_INSTRUCTIONS = `

# iMessage (Sendblue)

- this conversation is over imessage.
- answer directly. use github, weather, flight/hotel search, reminders, and
  other tools when relevant.
- **tool results do not render as cards here.** when you search flights or hotels,
  write the top few options out as text with the prices and times — otherwise the
  user sees nothing.
- approvals **do** work here: when something needs a yes, ask plainly and they
  reply YES or NO. keep the question to one line.
- \`save_memory\` is blocked on this channel and will come back denied — don't
  try it. their profile and long-term memory live at **settings → profile** on
  the web app. you can still fix their timezone or name with \`update_profile\`,
  which works fine here.
- \`text_me\` is pointless here — you're already texting them.`;

function instructionsForChannel(kind: string | undefined, base: string) {
  if (kind === "sendblue") {
    return `${base}${IMESSAGE_INSTRUCTIONS}`;
  }
  return base;
}

// Used when there is no profile to read a timezone from. Sessions that do have
// one get the date via buildUserContextPrompt instead, in the user's zone.
function withoutProfile(kind: string | undefined) {
  return instructionsForChannel(
    kind,
    `${BASE_INSTRUCTIONS}\n\n---\n\n${currentDatePrompt()}`,
  );
}

export default defineDynamic({
  events: {
    "session.started": async (_event, ctx: DynamicResolveContext) => {
      const userId = ctx.session.auth.current?.principalId;
      if (!userId || userId.startsWith("eve:")) {
        return defineInstructions({ markdown: withoutProfile(ctx.channel.kind) });
      }

      const context = await fetchUserContext(userId);
      if (!context) {
        return defineInstructions({ markdown: withoutProfile(ctx.channel.kind) });
      }

      const userBlock = buildUserContextPrompt(context);
      return defineInstructions({
        markdown: instructionsForChannel(
          ctx.channel.kind,
          `${BASE_INSTRUCTIONS}\n\n---\n\n${userBlock}`,
        ),
      });
    },
  },
});
