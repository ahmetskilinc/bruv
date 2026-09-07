import { defineDynamic, defineInstructions } from "eve/instructions";
import type { DynamicResolveContext } from "eve/instructions";
import { BASE_INSTRUCTIONS } from "./lib/base-instructions.js";
import { currentDatePrompt } from "./lib/current-time.js";
import { buildUserContextPrompt, fetchUserContext } from "./lib/memory-internal.js";

const IMESSAGE_INSTRUCTIONS = `

# iMessage (Sendblue)

- this conversation is over imessage. there is no browser ui for tool approvals here.
- answer directly. use github, weather, flight/hotel search, linear, and other
  tools when relevant.
- **tool results do not render as cards here.** when you search flights or hotels,
  write the top few options out as text with the prices and times — otherwise the
  user sees nothing.
- do **not** call \`save_memory\` unless the user explicitly asks you to remember
  or save something.
- if they want to update long-term memory, tell them to edit **settings → profile**
  on the web app.`;

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
