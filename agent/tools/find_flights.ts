import { defineTool } from "eve/tools";
import { z } from "zod";
import type {
  FlightLayover,
  FlightOption,
  FlightSearchOutput,
  FlightSegment,
} from "../../shared/tools/flights.js";
import {
  daysBetween,
  isValidDate,
  passengerCount,
  serpApiSearch,
} from "../lib/serpapi.js";

// Flight search via SerpApi's Google Flights engine — same results the user
// would get on google.com/travel, no airline or GDS approval needed.

// SerpApi trip types.
const ROUND_TRIP = 1;
const ONE_WAY = 2;

const CABINS = {
  economy: 1,
  premium_economy: 2,
  business: 3,
  first: 4,
} as const;

// SerpApi `stops`: 0 any, 1 nonstop only, 2 one stop or fewer, 3 two or fewer.
const NONSTOP_ONLY = 1;

// Keep the payload (and the model's context) bounded — nobody reads past this.
const MAX_OPTIONS = 8;

interface RawAirport {
  name?: string;
  id?: string;
  time?: string;
}

interface RawSegment {
  departure_airport?: RawAirport;
  arrival_airport?: RawAirport;
  duration?: number;
  airplane?: string;
  airline?: string;
  airline_logo?: string;
  travel_class?: string;
  flight_number?: string;
  overnight?: boolean;
}

interface RawLayover {
  duration?: number;
  name?: string;
  id?: string;
  overnight?: boolean;
}

interface RawItinerary {
  flights?: RawSegment[];
  layovers?: RawLayover[];
  total_duration?: number;
  carbon_emissions?: { difference_percent?: number };
  price?: number;
}

interface RawFlightsResponse {
  best_flights?: RawItinerary[];
  other_flights?: RawItinerary[];
  price_insights?: {
    price_level?: string;
    typical_price_range?: number[];
  };
  search_metadata?: { google_flights_url?: string };
}

function mapSegment(raw: RawSegment): FlightSegment {
  return {
    airline: raw.airline ?? "Unknown airline",
    airlineLogo: raw.airline_logo ?? "",
    flightNumber: raw.flight_number ?? "",
    fromCode: raw.departure_airport?.id ?? "",
    fromName: raw.departure_airport?.name ?? "",
    departsAt: raw.departure_airport?.time ?? "",
    toCode: raw.arrival_airport?.id ?? "",
    toName: raw.arrival_airport?.name ?? "",
    arrivesAt: raw.arrival_airport?.time ?? "",
    durationMinutes: raw.duration ?? 0,
    cabin: raw.travel_class ?? "Economy",
    aircraft: raw.airplane,
    overnight: raw.overnight,
  };
}

function mapLayover(raw: RawLayover): FlightLayover {
  return {
    name: raw.name ?? "",
    code: raw.id ?? "",
    durationMinutes: raw.duration ?? 0,
    overnight: raw.overnight,
  };
}

function mapItinerary(raw: RawItinerary, currency: string, best: boolean): FlightOption {
  const segments = (raw.flights ?? []).map(mapSegment);
  return {
    price: raw.price ?? 0,
    currency,
    totalDurationMinutes: raw.total_duration ?? 0,
    stops: Math.max(segments.length - 1, 0),
    segments,
    layovers: (raw.layovers ?? []).map(mapLayover),
    best,
    emissionsDeltaPercent: raw.carbon_emissions?.difference_percent,
  };
}

export default defineTool({
  description:
    "Search real flights between two airports or cities for a given date and party size. Use whenever someone asks to find, price, or compare flights, or plan a trip. Returns priced itineraries with airlines, times, stops and duration.",
  inputSchema: z.object({
    from: z
      .string()
      .min(3)
      .max(3)
      .describe(
        "Origin as a 3-letter IATA code. Prefer the metro code when a city has several airports: LON (all London), NYC, PAR, TYO, MIL, ROM. Otherwise the airport code, e.g. LHR, IST, LIS.",
      ),
    to: z
      .string()
      .min(3)
      .max(3)
      .describe("Destination as a 3-letter IATA or metro code, same rules as `from`."),
    departDate: z
      .string()
      .describe("Outbound date as YYYY-MM-DD. Must be today or later."),
    returnDate: z
      .string()
      .optional()
      .describe("Return date as YYYY-MM-DD. Omit for a one-way search."),
    adults: z
      .number()
      .int()
      .min(1)
      .max(9)
      .default(1)
      .describe("Passengers aged 12+."),
    children: z
      .number()
      .int()
      .min(0)
      .max(8)
      .default(0)
      .describe("Passengers aged 2-11."),
    infants: z
      .number()
      .int()
      .min(0)
      .max(8)
      .default(0)
      .describe("Passengers under 2, travelling on a lap."),
    cabin: z
      .enum(["economy", "premium_economy", "business", "first"])
      .default("economy")
      .describe("Cabin class to price."),
    nonStop: z
      .boolean()
      .default(false)
      .describe("Only return direct flights with no connections."),
    maxPrice: z
      .number()
      .positive()
      .optional()
      .describe("Cap results at this price, in `currency`."),
    currency: z
      .string()
      .length(3)
      .default("GBP")
      .describe("ISO currency code to quote prices in, e.g. GBP, EUR, USD."),
  }),
  async execute(input) {
    const from = input.from.trim().toUpperCase();
    const to = input.to.trim().toUpperCase();
    const currency = input.currency.trim().toUpperCase();

    if (from === to) {
      return { error: "Origin and destination are the same airport." };
    }
    if (!isValidDate(input.departDate)) {
      return { error: `"${input.departDate}" isn't a valid YYYY-MM-DD date.` };
    }
    if (input.returnDate && !isValidDate(input.returnDate)) {
      return { error: `"${input.returnDate}" isn't a valid YYYY-MM-DD date.` };
    }
    if (input.returnDate && daysBetween(input.departDate, input.returnDate) < 0) {
      return { error: "The return date is before the departure date." };
    }

    const adults = passengerCount(input.adults) || 1;
    const children = passengerCount(input.children);
    const infants = passengerCount(input.infants);

    const result = await serpApiSearch<RawFlightsResponse>({
      engine: "google_flights",
      departure_id: from,
      arrival_id: to,
      outbound_date: input.departDate,
      return_date: input.returnDate,
      type: input.returnDate ? ROUND_TRIP : ONE_WAY,
      adults,
      children,
      infants_on_lap: infants,
      travel_class: CABINS[input.cabin],
      stops: input.nonStop ? NONSTOP_ONLY : undefined,
      max_price: input.maxPrice,
      currency,
      hl: "en",
      gl: "uk",
    });

    if (!result.ok) {
      return { error: result.error };
    }

    const raw = result.data;
    const options = [
      ...(raw.best_flights ?? []).map((item) => mapItinerary(item, currency, true)),
      ...(raw.other_flights ?? []).map((item) => mapItinerary(item, currency, false)),
    ]
      .filter((option) => option.segments.length > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, MAX_OPTIONS);

    if (options.length === 0) {
      return {
        error: `No flights found from ${from} to ${to} on ${input.departDate}. Try nearby dates, a metro code like LON, or dropping the non-stop filter.`,
      };
    }

    const range = raw.price_insights?.typical_price_range;

    return {
      from,
      to,
      departDate: input.departDate,
      returnDate: input.returnDate,
      passengers: adults + children + infants,
      currency,
      tripType: input.returnDate ? "round-trip" : "one-way",
      options,
      priceLevel: raw.price_insights?.price_level,
      typicalPriceRange:
        range && range.length === 2 ? ([range[0], range[1]] as [number, number]) : undefined,
      searchUrl: raw.search_metadata?.google_flights_url ?? "",
    } satisfies FlightSearchOutput;
  },
});
