import { defineTool } from "eve/tools";
import { z } from "zod";
import type { FlightOption } from "../../shared/tools/flights.js";
import type { HotelOption } from "../../shared/tools/hotels.js";
import type {
  PackageTier,
  TripPackage,
  TripPlanOutput,
} from "../../shared/tools/package.js";
import { AIRPORTS_PATTERN, searchFlights, searchHotels } from "../lib/travel-search.js";

// A whole trip in one call: round-trip flights plus somewhere to stay for the
// same nights, combined into budget / sweet spot / splash out packages. Costs
// two SerpApi searches, so prefer it over calling find_flights + find_hotels
// separately for the same trip.

const TIER_LABELS: Record<PackageTier, string> = {
  budget: "budget",
  sweet_spot: "sweet spot",
  splash_out: "splash out",
};

// A direct flight is worth paying something for, but not anything.
const DIRECT_FLIGHT_PREMIUM = 1.25;
const MAX_ALTERNATIVES = 2;

interface Candidate {
  hotel: HotelOption;
  total: number;
}

/**
 * Picks the flight to price the packages on: the cheapest direct one if it is
 * within a quarter of the outright cheapest, otherwise just the cheapest.
 * Mirrors what someone actually books.
 */
function pickFlight(options: FlightOption[]) {
  const cheapest = options[0];
  const direct = options.find((option) => option.stops === 0);
  if (direct && cheapest && direct.price <= cheapest.price * DIRECT_FLIGHT_PREMIUM) {
    return direct;
  }
  return cheapest;
}

/** Whole-stay cost, falling back to the nightly rate when Google omits a total. */
function stayTotal(hotel: HotelOption, nights: number) {
  if (typeof hotel.totalPrice === "number" && hotel.totalPrice > 0) {
    return hotel.totalPrice;
  }
  if (typeof hotel.pricePerNight === "number" && hotel.pricePerNight > 0) {
    return hotel.pricePerNight * nights;
  }
  return undefined;
}

/**
 * Best value: rating and price both scaled to 0-1 across the candidates, then
 * the biggest gap between the two. Naturally lands on a well-rated place that
 * isn't the most expensive, which is what "sweet spot" means to a person.
 */
function bestValue(candidates: Candidate[]) {
  const prices = candidates.map((entry) => entry.total);
  const ratings = candidates.map((entry) => entry.hotel.rating ?? 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const priceSpread = maxPrice - minPrice || 1;
  const ratingSpread = maxRating - minRating || 1;

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const entry of candidates) {
    const ratingNorm = ((entry.hotel.rating ?? 0) - minRating) / ratingSpread;
    const priceNorm = (entry.total - minPrice) / priceSpread;
    const score = ratingNorm - priceNorm;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

/**
 * Cheapest place that isn't a dive. The outright cheapest result is often badly
 * rated, and recommending it as "budget" is how you lose someone's trust — so
 * prefer the cheapest decent one and only fall back when nothing qualifies.
 */
function bestBudget(candidates: Candidate[]) {
  return (
    candidates.find((entry) => (entry.hotel.rating ?? 0) >= 4) ??
    candidates.find((entry) => (entry.hotel.rating ?? 0) >= 3.5) ??
    candidates[0]!
  );
}

/** The nicest place worth splashing on — most expensive that is still well rated. */
function bestSplurge(candidates: Candidate[]) {
  const wellRated = candidates.filter((entry) => (entry.hotel.rating ?? 0) >= 4);
  const pool = wellRated.length > 0 ? wellRated : candidates;
  return pool.reduce((a, b) => (b.total > a.total ? b : a));
}

export default defineTool({
  description:
    "Plan a whole trip in one go — round-trip flights plus somewhere to stay for the same nights, combined into budget / sweet spot / splash out packages with total prices. Use this whenever someone wants a trip, holiday, weekend away, or 'flights and a hotel' for a destination. Prefer it over calling find_flights and find_hotels separately.",
  inputSchema: z.object({
    from: z
      .string()
      .regex(AIRPORTS_PATTERN, "must be 3-letter IATA airport codes, comma-separated")
      .describe(
        "Origin AIRPORT codes (IATA, 3 letters). City/metro codes like LON or NYC do NOT work — comma-separate a city's airports instead: 'LHR,LGW,STN,LTN' for London.",
      ),
    to: z
      .string()
      .regex(AIRPORTS_PATTERN, "must be 3-letter IATA airport codes, comma-separated")
      .describe("Destination airport codes, e.g. 'IST,SAW' for Istanbul."),
    destination: z
      .string()
      .min(2)
      .describe(
        "Where to look for a stay, as a place name — usually the city, e.g. 'Istanbul'. Narrow it to a neighbourhood if they asked for one.",
      ),
    departDate: z.string().describe("Outbound date as YYYY-MM-DD."),
    returnDate: z.string().describe("Return date as YYYY-MM-DD. A trip is a round trip."),
    adults: z.number().int().min(1).max(9).default(2).describe("Travellers aged 12+."),
    childAges: z
      .array(z.number().int().min(1).max(17))
      .max(8)
      .optional()
      .describe("Age of each child travelling, e.g. [4, 9]. Ages change both prices."),
    cabin: z
      .enum(["economy", "premium_economy", "business", "first"])
      .default("economy")
      .describe("Cabin class to price the flights in."),
    nonStop: z.boolean().default(false).describe("Only consider direct flights."),
    maxHotelPricePerNight: z
      .number()
      .positive()
      .optional()
      .describe("Cap the nightly hotel rate, in `currency`."),
    minHotelRating: z
      .enum(["3.5", "4", "4.5"])
      .optional()
      .describe("Only consider stays rated at least this, out of 5."),
    vacationRentals: z
      .boolean()
      .default(false)
      .describe("Look for apartments and holiday rentals instead of hotels."),
    currency: z
      .string()
      .length(3)
      .default("GBP")
      .describe("ISO currency code to quote prices in."),
  }),
  async execute(input) {
    const childAges = input.childAges ?? [];
    const travellers = input.adults + childAges.length;

    // Both searches at once — they're independent and this halves the wait.
    const [flightResult, hotelResult] = await Promise.all([
      searchFlights({
        from: input.from,
        to: input.to,
        departDate: input.departDate,
        returnDate: input.returnDate,
        adults: input.adults,
        children: childAges.length,
        cabin: input.cabin,
        nonStop: input.nonStop,
        currency: input.currency,
      }),
      searchHotels({
        location: input.destination,
        checkIn: input.departDate,
        checkOut: input.returnDate,
        adults: input.adults,
        childAges,
        maxPricePerNight: input.maxHotelPricePerNight,
        minRating: input.minHotelRating,
        vacationRentals: input.vacationRentals,
        currency: input.currency,
      }),
    ]);

    // Report both failures at once rather than making the model retry twice.
    if (!flightResult.ok && !hotelResult.ok) {
      return { error: `${flightResult.error} Also: ${hotelResult.error}` };
    }
    if (!flightResult.ok) {
      return { error: `Couldn't price the flights. ${flightResult.error}` };
    }
    if (!hotelResult.ok) {
      return { error: `Found flights, but no stays. ${hotelResult.error}` };
    }

    const flights = flightResult.data;
    const hotels = hotelResult.data;
    const nights = hotels.nights;

    const flight = pickFlight(flights.options);
    if (!flight) {
      return { error: "No usable flight itineraries came back for that route." };
    }

    const candidates: Candidate[] = hotels.options
      .map((hotel) => ({ hotel, total: stayTotal(hotel, nights) }))
      .filter((entry): entry is Candidate => typeof entry.total === "number")
      .sort((a, b) => a.total - b.total);

    if (candidates.length === 0) {
      return {
        error: `Found flights and stays in ${hotels.location}, but Google didn't return prices for any of them. Try different dates.`,
      };
    }

    // Distinct picks per tier, falling back to the cheapest when a small result
    // set makes two tiers collide.
    const picks = new Map<PackageTier, Candidate>();
    picks.set("budget", bestBudget(candidates));
    const remaining = candidates.filter((entry) => entry !== picks.get("budget"));
    if (remaining.length > 0) {
      picks.set("sweet_spot", bestValue(remaining));
    }
    const forSplurge = remaining.filter((entry) => entry !== picks.get("sweet_spot"));
    if (forSplurge.length > 0) {
      picks.set("splash_out", bestSplurge(forSplurge));
    }

    const packages: TripPackage[] = [...picks.entries()]
      .map(([tier, entry]) => {
        const total = flight.price + entry.total;
        return {
          tier,
          label: TIER_LABELS[tier],
          hotel: entry.hotel,
          hotelTotal: Math.round(entry.total),
          flightTotal: Math.round(flight.price),
          total: Math.round(total),
          perPerson: Math.round(total / travellers),
        } satisfies TripPackage;
      })
      .sort((a, b) => a.total - b.total);

    // Lead with the sweet spot when there is one — it's the pick a person makes.
    const recommended: PackageTier =
      packages.find((entry) => entry.tier === "sweet_spot")?.tier ?? packages[0]!.tier;

    return {
      from: flights.from,
      to: flights.to,
      destination: hotels.location,
      departDate: input.departDate,
      returnDate: input.returnDate,
      nights,
      travellers,
      currency: flights.currency,
      flight,
      flightAlternatives: flights.options
        .filter((option) => option !== flight)
        .slice(0, MAX_ALTERNATIVES),
      packages,
      recommended,
      flightSearchUrl: flights.searchUrl,
      hotelSearchUrl: hotels.searchUrl,
    } satisfies TripPlanOutput;
  },
});
