import { defineTool } from "eve/tools";
import { z } from "zod";
import type { HotelOption, HotelSearchOutput } from "../../shared/tools/hotels.js";
import {
  daysBetween,
  isValidDate,
  passengerCount,
  serpApiSearch,
} from "../lib/serpapi.js";

// Hotel search via SerpApi's Google Hotels engine. Google prices by total
// occupancy (adults + children), not by room count, so there is no `rooms`
// input — for two rooms, search the full head count and read the rates.

// SerpApi `sort_by`.
const SORT = {
  relevance: undefined,
  price: 3,
  rating: 8,
  reviews: 13,
} as const;

// SerpApi `rating` buckets — it only accepts these three thresholds.
const RATING_BUCKETS = { 3.5: 7, 4: 8, 4.5: 9 } as const;

const MAX_OPTIONS = 10;
// Google returns long amenity lists; the card and the model only need the gist.
const MAX_AMENITIES = 6;

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

export default defineTool({
  description:
    "Search real hotels and stays in a city for given dates and party size. Use whenever someone asks where to stay, to find or price a hotel, or to plan a trip. Returns properties with nightly and total prices, ratings and amenities.",
  inputSchema: z.object({
    location: z
      .string()
      .min(2)
      .describe(
        "Where to stay — a city, neighbourhood, or landmark, e.g. 'Lisbon', 'Shoreditch London', 'near Sagrada Familia'.",
      ),
    checkIn: z.string().describe("Check-in date as YYYY-MM-DD."),
    checkOut: z.string().describe("Check-out date as YYYY-MM-DD."),
    adults: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(2)
      .describe("Adults staying. Google prices by total occupancy, not rooms."),
    childAges: z
      .array(z.number().int().min(1).max(17))
      .max(10)
      .optional()
      .describe("Age of each child staying, e.g. [4, 9]. Ages change the price."),
    maxPricePerNight: z
      .number()
      .positive()
      .optional()
      .describe("Cap the nightly rate, in `currency`."),
    minRating: z
      .enum(["3.5", "4", "4.5"])
      .optional()
      .describe("Only return properties rated at least this, out of 5."),
    sortBy: z
      .enum(["relevance", "price", "rating", "reviews"])
      .default("relevance")
      .describe("Result ordering. 'relevance' is Google's own ranking."),
    vacationRentals: z
      .boolean()
      .default(false)
      .describe("Search apartments and holiday rentals instead of hotels."),
    currency: z
      .string()
      .length(3)
      .default("GBP")
      .describe("ISO currency code to quote prices in, e.g. GBP, EUR, USD."),
  }),
  async execute(input) {
    const currency = input.currency.trim().toUpperCase();

    if (!isValidDate(input.checkIn)) {
      return { error: `"${input.checkIn}" isn't a valid YYYY-MM-DD date.` };
    }
    if (!isValidDate(input.checkOut)) {
      return { error: `"${input.checkOut}" isn't a valid YYYY-MM-DD date.` };
    }

    const nights = daysBetween(input.checkIn, input.checkOut);
    if (nights < 1) {
      return { error: "The check-out date must be at least one night after check-in." };
    }

    const adults = passengerCount(input.adults) || 2;
    const childAges = input.childAges ?? [];

    const result = await serpApiSearch<RawHotelsResponse>({
      engine: "google_hotels",
      q: input.location.trim(),
      check_in_date: input.checkIn,
      check_out_date: input.checkOut,
      adults,
      children: childAges.length || undefined,
      children_ages: childAges.length ? childAges.join(",") : undefined,
      max_price: input.maxPricePerNight,
      rating: input.minRating ? RATING_BUCKETS[input.minRating] : undefined,
      sort_by: SORT[input.sortBy],
      vacation_rentals: input.vacationRentals || undefined,
      currency,
      hl: "en",
      gl: "uk",
    });

    if (!result.ok) {
      return { error: result.error };
    }

    const options = (result.data.properties ?? [])
      .map(mapProperty)
      .slice(0, MAX_OPTIONS);

    if (options.length === 0) {
      return {
        error: `No stays found in ${input.location} for those dates. Try a wider area, different dates, or dropping the rating and price filters.`,
      };
    }

    return {
      location: input.location.trim(),
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      adults,
      children: childAges.length,
      currency,
      options,
      searchUrl: result.data.search_metadata?.google_hotels_url ?? "",
    } satisfies HotelSearchOutput;
  },
});
