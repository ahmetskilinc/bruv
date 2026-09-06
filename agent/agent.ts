import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-sonnet-4.6",
  modelOptions: {
    providerOptions: {
      anthropic: {
        // Adaptive thinking: Claude sizes its own reasoning per question and
        // interleaves it with tool calls. The old fixed `budgetTokens` cap is
        // deprecated on 4.6 — at 2048 it squeezed the returned reasoning
        // summary down to a single line.
        thinking: {
          type: "adaptive",
          // Default on 4.6, but explicit so reasoning doesn't silently go
          // blank if the model is later swapped for one that omits it.
          display: "summarized",
        },
      },
    },
  },
  // Reasoning depth. "high" is the default; raise per-question spend with
  // "xhigh"/"max" only on models that support them (Sonnet 4.6 tops out at
  // "high"/"max").
  reasoning: "high",
});
