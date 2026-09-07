// Thin SerpApi client shared by find_flights / find_hotels. SerpApi proxies
// Google Flights and Google Hotels, so we get the same results the user would
// see on google.com/travel without needing airline or GDS approval.
//
// Needs SERPAPI_API_KEY (free tier: 250 searches/month at serpapi.com).

const ENDPOINT = "https://serpapi.com/search.json";

const MISSING_KEY =
  "Travel search isn't set up. Tell the user to add a SERPAPI_API_KEY from serpapi.com (free tier is 250 searches/month).";

/** Non-throwing result so tools can surface a friendly message instead of failing the turn. */
export type SerpApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string) {
  return { ok: false as const, error };
}

export function serpApiKey() {
  return process.env.SERPAPI_API_KEY?.trim() ?? "";
}

/**
 * Calls SerpApi and normalizes its two failure modes — an HTTP error, and a
 * 200 response carrying an `error` string (which is what "no results" looks
 * like) — into a single `{ error }` shape.
 */
export async function serpApiSearch<T>(
  params: Record<string, string | number | boolean | undefined>,
): Promise<SerpApiResult<T>> {
  const key = serpApiKey();
  if (!key) {
    return fail(MISSING_KEY);
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("api_key", key);
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(name, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
  } catch {
    return fail("Couldn't reach the travel search service. Try again in a moment.");
  }

  if (response.status === 401) {
    return fail("The SerpApi key is invalid — tell the user to check SERPAPI_API_KEY.");
  }
  if (response.status === 429) {
    return fail("Travel search is out of quota for this month (SerpApi rate limit).");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fail(`Travel search returned an unreadable response (${response.status}).`);
  }

  const record = body as Record<string, unknown>;
  const apiError = typeof record.error === "string" ? record.error : undefined;
  if (apiError) {
    return fail(apiError);
  }
  if (!response.ok) {
    return fail(`Travel search failed (${response.status}).`);
  }

  return { ok: true as const, data: body as T };
}

/** `1` if the value is a positive number, else `0` — SerpApi wants ints, not blanks. */
export function passengerCount(value: number | undefined) {
  return typeof value === "number" && value > 0 ? Math.floor(value) : 0;
}

/** Formats "YYYY-MM-DD" strictly; SerpApi rejects anything else. */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Whole days between two ISO dates. Negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}
