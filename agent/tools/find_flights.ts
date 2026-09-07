import { defineTool } from "eve/tools";
import { z } from "zod";
import { AIRPORTS_PATTERN, searchFlights } from "../lib/travel-search.js";

// Flight search via SerpApi's Google Flights engine — same results the user
// would get on google.com/travel, no airline or GDS approval needed. The
// request and response handling lives in lib/travel-search.ts, shared with
// find_hotels and plan_trip.

export default defineTool({
  description:
    "Search real flights between two airports for a given date and party size. Use whenever someone asks to find, price, or compare flights. For a whole trip with somewhere to stay, use `plan_trip` instead.",
  inputSchema: z.object({
    from: z
      .string()
      .regex(AIRPORTS_PATTERN, "must be 3-letter IATA airport codes, comma-separated")
      .describe(
        "Origin AIRPORT codes (IATA, 3 letters). City/metro codes like LON or NYC do NOT work — to cover a whole city, comma-separate its airports: 'LHR,LGW,STN,LTN' for London, 'JFK,EWR,LGA' for New York, 'CDG,ORY' for Paris, 'IST,SAW' for Istanbul.",
      ),
    to: z
      .string()
      .regex(AIRPORTS_PATTERN, "must be 3-letter IATA airport codes, comma-separated")
      .describe("Destination airport codes, same rules as `from`."),
    departDate: z.string().describe("Outbound date as YYYY-MM-DD. Must be today or later."),
    returnDate: z
      .string()
      .optional()
      .describe("Return date as YYYY-MM-DD. Omit for a one-way search."),
    adults: z.number().int().min(1).max(9).default(1).describe("Passengers aged 12+."),
    children: z.number().int().min(0).max(8).default(0).describe("Passengers aged 2-11."),
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
    maxPrice: z.number().positive().optional().describe("Cap results at this price, in `currency`."),
    currency: z
      .string()
      .length(3)
      .default("GBP")
      .describe("ISO currency code to quote prices in, e.g. GBP, EUR, USD."),
  }),
  async execute(input) {
    const result = await searchFlights(input);
    return result.ok ? result.data : { error: result.error };
  },
});
