// Shared Google Flights / Google Hotels search logic, so find_flights,
// find_hotels and plan_trip all speak to SerpApi the same way instead of each
// carrying their own copy of the request shape and response mapping.

import type {
  FlightLayover,
  FlightOption,
  FlightSearchOutput,
  FlightSegment,
} from "../../shared/tools/flights.js";
import type { HotelOption, HotelSearchOutput } from "../../shared/tools/hotels.js";
import {
  daysBetween,
  isValidDate,
  passengerCount,
  serpApiSearch,
  type SerpApiResult,
} from "./serpapi.js";

// SerpApi trip types.
const ROUND_TRIP = 1;
const ONE_WAY = 2;

export const CABINS = {
  economy: 1,
  premium_economy: 2,
  business: 3,
  first: 4,
} as const;

export type Cabin = keyof typeof CABINS;

// SerpApi `stops`: 0 any, 1 nonstop only, 2 one stop or fewer, 3 two or fewer.
const NONSTOP_ONLY = 1;

// Keep the payload (and the model's context) bounded — nobody reads past this.
const MAX_FLIGHT_OPTIONS = 8;
const MAX_HOTEL_OPTIONS = 10;
// Google returns long amenity lists; the card and the model only need the gist.
const MAX_AMENITIES = 6;

// Google Flights takes real airport codes (or /m/ kgmids), NOT city/metro codes
// — LON and NYC return zero results while still costing a search. Multiple
// airports are comma-separated instead.
export const AIRPORTS_PATTERN = /^[A-Za-z]{3}(?:\s*,\s*[A-Za-z]{3})*$/u;
const MAX_AIRPORTS = 4;

export function normalizeAirports(value: string) {
  const codes = value
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(codes)].slice(0, MAX_AIRPORTS);
}

// SerpApi hotel `sort_by`.
const HOTEL_SORT = {
  relevance: undefined,
  price: 3,
  rating: 8,
  reviews: 13,
} as const;

export type HotelSort = keyof typeof HOTEL_SORT;

// SerpApi hotel `rating` — it only accepts these three thresholds.
const RATING_BUCKETS = { "3.5": 7, "4": 8, "4.5": 9 } as const;

export type MinRating = keyof typeof RATING_BUCKETS;

function fail(error: string): SerpApiResult<never> {
  return { ok: false, error };
}

/* ---------------------------------------------------------------- flights */

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

export interface FlightSearchParams {
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  cabin?: Cabin;
  nonStop?: boolean;
  maxPrice?: number;
  currency: string;
}

export async function searchFlights(
  params: FlightSearchParams,
): Promise<SerpApiResult<FlightSearchOutput>> {
  const fromCodes = normalizeAirports(params.from);
  const toCodes = normalizeAirports(params.to);
  const from = fromCodes.join(",");
  const to = toCodes.join(",");
  const currency = params.currency.trim().toUpperCase();

  if (fromCodes.length === 0 || toCodes.length === 0) {
    return fail("Need at least one 3-letter airport code on each side.");
  }
  if (fromCodes.some((code) => toCodes.includes(code))) {
    return fail("Origin and destination share an airport.");
  }
  if (!isValidDate(params.departDate)) {
    return fail(`"${params.departDate}" isn't a valid YYYY-MM-DD date.`);
  }
  if (params.returnDate && !isValidDate(params.returnDate)) {
    return fail(`"${params.returnDate}" isn't a valid YYYY-MM-DD date.`);
  }
  if (params.returnDate && daysBetween(params.departDate, params.returnDate) < 0) {
    return fail("The return date is before the departure date.");
  }

  const adults = passengerCount(params.adults) || 1;
  const children = passengerCount(params.children);
  const infants = passengerCount(params.infants);

  const result = await serpApiSearch<RawFlightsResponse>({
    engine: "google_flights",
    departure_id: from,
    arrival_id: to,
    outbound_date: params.departDate,
    return_date: params.returnDate,
    type: params.returnDate ? ROUND_TRIP : ONE_WAY,
    adults,
    children,
    infants_on_lap: infants,
    travel_class: CABINS[params.cabin ?? "economy"],
    stops: params.nonStop ? NONSTOP_ONLY : undefined,
    max_price: params.maxPrice,
    currency,
    hl: "en",
    gl: "uk",
  });

  if (!result.ok) {
    console.error(
      `[flights] search failed (${from} -> ${to} on ${params.departDate}): ${result.error}`,
    );
    return result;
  }

  const raw = result.data;
  const options = [
    ...(raw.best_flights ?? []).map((item) => mapItinerary(item, currency, true)),
    ...(raw.other_flights ?? []).map((item) => mapItinerary(item, currency, false)),
  ]
    .filter((option) => option.segments.length > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_FLIGHT_OPTIONS);

  if (options.length === 0) {
    console.warn(`[flights] zero results for ${from} -> ${to} on ${params.departDate}`);
    return fail(
      `No flights found from ${from} to ${to} on ${params.departDate}. Check the airport codes are real IATA codes, then try nearby dates, adding the city's other airports, or dropping the non-stop filter.`,
    );
  }

  const range = raw.price_insights?.typical_price_range;

  return {
    ok: true,
    data: {
      from,
      to,
      departDate: params.departDate,
      returnDate: params.returnDate,
      passengers: adults + children + infants,
      currency,
      tripType: params.returnDate ? "round-trip" : "one-way",
      options,
      priceLevel: raw.price_insights?.price_level,
      typicalPriceRange:
        range && range.length === 2 ? ([range[0], range[1]] as [number, number]) : undefined,
      searchUrl: raw.search_metadata?.google_flights_url ?? "",
    },
  };
}

/* ----------------------------------------------------------------- hotels */

interface RawProperty {
  name?: string;
  type?: string;
  link?: string;
  rate_per_night?: { extracted_lowest?: number };
  total_rate?: { extracted_lowest?: number };
  overall_rating?: number;
  reviews?: number;
  extracted_hotel_class?: number;
  location_rating?: number;
  images?: { thumbnail?: string }[];
  amenities?: string[];
  check_in_time?: string;
  check_out_time?: string;
}

interface RawHotelsResponse {
  properties?: RawProperty[];
  search_metadata?: { google_hotels_url?: string };
}

function mapProperty(raw: RawProperty): HotelOption {
  return {
    name: raw.name ?? "Unnamed property",
    type: raw.type ?? "hotel",
    pricePerNight: raw.rate_per_night?.extracted_lowest,
    totalPrice: raw.total_rate?.extracted_lowest,
    rating: raw.overall_rating,
    reviews: raw.reviews,
    stars: raw.extracted_hotel_class,
    locationRating: raw.location_rating,
    image: raw.images?.[0]?.thumbnail,
    url: raw.link,
    amenities: (raw.amenities ?? []).slice(0, MAX_AMENITIES),
    checkInTime: raw.check_in_time,
    checkOutTime: raw.check_out_time,
  };
}

export interface HotelSearchParams {
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  childAges?: number[];
  maxPricePerNight?: number;
  minRating?: MinRating;
  sortBy?: HotelSort;
  vacationRentals?: boolean;
  currency: string;
}

export async function searchHotels(
  params: HotelSearchParams,
): Promise<SerpApiResult<HotelSearchOutput>> {
  const currency = params.currency.trim().toUpperCase();
  const location = params.location.trim();

  if (!isValidDate(params.checkIn)) {
    return fail(`"${params.checkIn}" isn't a valid YYYY-MM-DD date.`);
  }
  if (!isValidDate(params.checkOut)) {
    return fail(`"${params.checkOut}" isn't a valid YYYY-MM-DD date.`);
  }

  const nights = daysBetween(params.checkIn, params.checkOut);
  if (nights < 1) {
    return fail("The check-out date must be at least one night after check-in.");
  }

  const adults = passengerCount(params.adults) || 2;
  const childAges = params.childAges ?? [];

  const result = await serpApiSearch<RawHotelsResponse>({
    engine: "google_hotels",
    q: location,
    check_in_date: params.checkIn,
    check_out_date: params.checkOut,
    adults,
    children: childAges.length || undefined,
    children_ages: childAges.length ? childAges.join(",") : undefined,
    max_price: params.maxPricePerNight,
    rating: params.minRating ? RATING_BUCKETS[params.minRating] : undefined,
    sort_by: HOTEL_SORT[params.sortBy ?? "relevance"],
    vacation_rentals: params.vacationRentals || undefined,
    currency,
    hl: "en",
    gl: "uk",
  });

  if (!result.ok) {
    console.error(
      `[hotels] search failed (${location} ${params.checkIn}..${params.checkOut}): ${result.error}`,
    );
    return result;
  }

  const options = (result.data.properties ?? []).map(mapProperty).slice(0, MAX_HOTEL_OPTIONS);

  if (options.length === 0) {
    console.warn(`[hotels] zero results for ${location} ${params.checkIn}..${params.checkOut}`);
    return fail(
      `No stays found in ${location} for those dates. Try a wider area, different dates, or dropping the rating and price filters.`,
    );
  }

  return {
    ok: true,
    data: {
      location,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      nights,
      adults,
      children: childAges.length,
      currency,
      options,
      searchUrl: result.data.search_metadata?.google_hotels_url ?? "",
    },
  };
}
