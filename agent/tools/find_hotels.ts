import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchHotels } from "../lib/travel-search.js";

// Hotel search via SerpApi's Google Hotels engine. Google prices by total
// occupancy (adults + children), not by room count, so there is no `rooms`
// input — for two rooms, search the full head count and read the rates. The
// request and response handling lives in lib/travel-search.ts.

export default defineTool({
  description:
    "Search real hotels and stays in a city for given dates and party size. Use when someone asks where to stay or to price a hotel on its own. For a whole trip including flights, use `plan_trip` instead.",
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
    const result = await searchHotels(input);
    return result.ok ? result.data : { error: result.error };
  },
});
