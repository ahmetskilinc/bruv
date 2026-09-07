import { getSendblueAdapter, sendblueLineNumber } from "./sendblue.js";

// Posting to iMessage without starting an agent turn.
//
// Tools have no `to()` — cross-channel hand-off is a route/schedule-handler
// capability — but they don't need one here. "Text me the itinerary" means that
// exact itinerary, verbatim. Going through `to(...).send(...)` would spin a
// second model turn on the iMessage side and let it rewrite or truncate what
// was already written. Posting directly through the provider is both cheaper
// and more faithful, and it works even with no existing iMessage session.

export async function sendImessageToNumber(contactNumber: string, markdown: string) {
  const sendblue = getSendblueAdapter();
  const threadId = sendblue.encodeThreadId({
    fromNumber: sendblueLineNumber(),
    contactNumber,
  });

  await sendblue.postMessage(threadId, { markdown });
  return { threadId };
}
