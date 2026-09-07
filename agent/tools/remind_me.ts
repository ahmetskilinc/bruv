import { defineWorkflowTool } from "eve/tools";
import { sleep } from "workflow";
import { z } from "zod";
import { resolveReminderTime } from "../lib/reminder-time.js";
import { currentUserId } from "../lib/require-user.js";

// A durable one-shot reminder. The run suspends across the wait holding no
// compute, then its completion wakes THIS session — so the reminder comes back
// on whatever channel it was asked from, with no cron and no polling table.
//
// ⚠️ DO NOT RENAME OR MOVE THIS FILE, or rename `execute`. eve derives the
// workflow id from the module path plus the function name, so renaming either
// orphans every reminder that is currently in flight.

export default defineWorkflowTool({
  description:
    "Set a one-off reminder. It comes back to the user on whatever channel they asked from. " +
    "Use `inDuration` for relative delays ('30m', '2h', '3d') and `at` for clock times, as a " +
    "bare local wall clock like '2026-09-08T15:00' — resolve the date yourself from today's " +
    "date, but do NOT convert to UTC or apply any timezone offset. That is handled for you.",
  inputSchema: z.object({
    note: z
      .string()
      .min(1)
      .max(500)
      .describe(
        "What to say back to them, in their own words. 'call mum', not 'you set a reminder to call mum'.",
      ),
    at: z
      .string()
      .optional()
      .describe(
        "Local wall clock 'YYYY-MM-DDTHH:mm' in the user's own timezone. No offset, no Z.",
      ),
    inDuration: z
      .string()
      .optional()
      .describe("Relative delay instead of a clock time: '30m', '2h', '3d'."),
  }),
  execution: "background",
  async *execute({ note, at, inDuration }, ctx, task) {
    "use workflow";

    const due = await resolveReminderTime({
      userId: currentUserId(ctx) ?? null,
      at,
      inDuration,
    });

    // Echo the resolved local time so a misparse is caught immediately, rather
    // than silently at the wrong hour.
    yield task.postMessage(`Reminder set for ${due.humanLocal}.`);

    await sleep(new Date(due.instantIso));

    return { reminder: note, dueLocal: due.humanLocal };
  },
});
