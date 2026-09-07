// Formatting shared by the flight, hotel and trip cards.

export function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** "2026-12-27" -> "27 Dec". */
export function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

export function formatDuration(minutes: number) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest ? `${rest}m` : ""}`.trim() : `${rest}m`;
}

/** "2026-10-12 07:15" -> "07:15". Falls back to the raw string if unparsed. */
export function timeOf(value: string) {
  const match = /\d{2}:\d{2}/u.exec(value);
  return match?.[0] ?? value;
}

/** Google shows "+1" when a flight lands on a later calendar day. */
export function dayOffset(departsAt: string, arrivesAt: string) {
  if (!departsAt || !arrivesAt) return 0;
  const from = new Date(`${departsAt.slice(0, 10)}T00:00:00Z`).getTime();
  const to = new Date(`${arrivesAt.slice(0, 10)}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

export function stopsLabel(stops: number) {
  if (stops === 0) return "direct";
  return `${stops} stop${stops === 1 ? "" : "s"}`;
}
