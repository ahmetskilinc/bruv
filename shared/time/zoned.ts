// Wall-clock ↔ instant conversion for a named IANA zone, without a date library.
//
// Needed because the model is told "today is X in <user's zone>" and then emits
// a bare local wall clock ("2026-09-08T08:00"). Turning that into a real instant
// is the one bit of date maths we must never let the model do — it gets DST
// transitions wrong, and a reminder an hour late is worse than no reminder.

/**
 * Offset of `timeZone` from UTC, in ms, at a given instant.
 *
 * Intl can only format an instant *into* a zone, so we format and diff: render
 * the instant as local wall-clock parts, read them back as if they were UTC,
 * and the difference is the offset in effect at that moment.
 */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantMs));

  const value = (type: string) => {
    const part = parts.find((entry) => entry.type === type);
    return part ? Number(part.value) : 0;
  };

  // Some ICU builds render midnight as hour "24"; % 24 normalizes it.
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );

  return asUtc - instantMs;
}

/**
 * "2026-09-08T08:00" in "Europe/London" → the exact UTC instant.
 *
 * Two passes: the first offset is looked up at the naive guess, which is wrong
 * by an hour when the guess falls on the other side of a DST boundary from the
 * real instant; re-solving with the corrected instant settles it.
 */
export function wallClockToInstant(wall: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/u.exec(wall.trim());
  if (!match) {
    throw new Error(`"${wall}" is not a local wall clock like 2026-09-08T08:00.`);
  }

  const [, year, month, day, hour, minute, second] = match;
  const guess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0),
  );

  const firstPass = guess - zoneOffsetMs(guess, timeZone);
  const settled = guess - zoneOffsetMs(firstPass, timeZone);
  return new Date(settled);
}

export interface LocalParts {
  /** "YYYY-MM-DD" in `timeZone`. */
  date: string;
  /** 0-23 in `timeZone`. */
  hour: number;
  /** 0 (Sunday) - 6, in `timeZone`. */
  weekday: number;
}

/** The local date, hour and weekday for a zone — how the digest picks recipients. */
export function localParts(timeZone: string, now: Date = new Date()): LocalParts {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const hour =
    Number(
      new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, hour: "2-digit" }).format(now),
    ) % 24;

  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName);

  return { date, hour, weekday };
}

/** True when `timeZone` is a zone this runtime actually knows. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
