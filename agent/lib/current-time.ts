// eve composes the system prompt without a clock, and the model providers don't
// inject one either — so without this the agent silently reasons about "today"
// from its training cutoff. Anything date-shaped (flights, hotels, "how old is
// this PR", "next friday") depends on it.
//
// Injected per turn on iMessage, where one long-lived session spans days and a
// session.started-only injection would go stale.

const FALLBACK_TIMEZONE = "Europe/London";

function formatIn(timeZone: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  // ISO form too — tools take YYYY-MM-DD, and the model shouldn't have to
  // convert "Sunday 6 September 2026" by hand and get it wrong.
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return { date, time, iso };
}

/**
 * A short "today is …" block for the system prompt. Falls back to London if the
 * profile carries a timezone the runtime doesn't recognise.
 */
export function currentDatePrompt(timeZone?: string) {
  let zone = timeZone?.trim() || FALLBACK_TIMEZONE;
  let parts: ReturnType<typeof formatIn>;
  try {
    parts = formatIn(zone);
  } catch {
    zone = FALLBACK_TIMEZONE;
    parts = formatIn(zone);
  }

  return [
    "# Right now",
    `Today is ${parts.date} (${parts.iso}), ${parts.time} in ${zone}.`,
    "Resolve every relative date — today, tomorrow, next friday, this weekend, in two weeks — against that, and pass tools absolute YYYY-MM-DD dates. Never guess the date from your training data.",
  ].join("\n");
}
