import { wallClockToInstant } from "../../shared/time/zoned.js";
import { fetchUserContext } from "./memory-internal.js";

// Turning "8am tomorrow" into an instant. Deliberately server-side: the model
// is told today's date in the user's zone, but it must not do the offset or DST
// arithmetic itself — a reminder an hour late is worse than no reminder.

const FALLBACK_TIMEZONE = "Europe/London";

// In-flight workflow runs are pinned to the deployment that started them, so a
// reminder further out than this is a bet on deployment retention. See the
// warning in agent/tools/remind_me.ts.
const MAX_HORIZON_MS = 30 * 24 * 60 * 60 * 1000;

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)$/iu;

const DURATION_UNITS: Record<string, number> = {
  s: 1000,
  sec: 1000,
  secs: 1000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
};

export function parseDuration(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(`"${value}" isn't a duration like '30m', '2h', or '3d'.`);
  }
  return Number(match[1]) * DURATION_UNITS[match[2].toLowerCase()]!;
}

/** True for an ISO string that already pins its own offset, e.g. ...Z or ...+03:00. */
function hasExplicitOffset(value: string) {
  return /(?:Z|[+-]\d{2}:\d{2})$/u.test(value.trim());
}

function renderLocal(instant: Date, timeZone: string) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
  return `${formatted} (${timeZone})`;
}

export interface ResolvedReminderTime {
  instantIso: string;
  humanLocal: string;
  timezone: string;
}

/**
 * Marked `use step` so its result is journaled: a replay after the sleep reuses
 * the identical instant instead of re-reading the clock and drifting.
 */
export async function resolveReminderTime(input: {
  userId: string | null;
  at?: string;
  inDuration?: string;
}): Promise<ResolvedReminderTime> {
  "use step";

  const timezone =
    (input.userId ? (await fetchUserContext(input.userId))?.profile.timezone : undefined) ||
    FALLBACK_TIMEZONE;

  let instant: Date;
  if (input.inDuration) {
    instant = new Date(Date.now() + parseDuration(input.inDuration));
  } else if (input.at && hasExplicitOffset(input.at)) {
    instant = new Date(input.at);
  } else if (input.at) {
    instant = wallClockToInstant(input.at, timezone);
  } else {
    throw new Error("Give me either a time (`at`) or a delay (`inDuration`).");
  }

  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Couldn't read "${input.at ?? input.inDuration}" as a time.`);
  }

  const delta = instant.getTime() - Date.now();
  if (delta <= 0) {
    throw new Error(`${renderLocal(instant, timezone)} is in the past.`);
  }
  if (delta > MAX_HORIZON_MS) {
    throw new Error("Reminders are capped at 30 days out.");
  }

  return {
    instantIso: instant.toISOString(),
    humanLocal: renderLocal(instant, timezone),
    timezone,
  };
}
