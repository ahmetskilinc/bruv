// Output shape for the `plan_trip` tool, shared between the agent tool and the
// chat card so they stay in sync. A trip is one round-trip flight plus a choice
// of stay at three price points, with the combined totals worked out.

import type { FlightOption } from "./flights.js";
import type { HotelOption } from "./hotels.js";

export type PackageTier = "budget" | "sweet_spot" | "splash_out";

export interface TripPackage {
  tier: PackageTier;
  /** Human label for the tier, e.g. "sweet spot". */
  label: string;
  hotel: HotelOption;
  /** Whole stay, all guests, in `currency`. */
  hotelTotal: number;
  /** Round-trip flights for the whole party, in `currency`. */
  flightTotal: number;
  /** hotelTotal + flightTotal. */
  total: number;
  /** `total` split across travellers, rounded. */
  perPerson: number;
}

export interface TripPlanOutput {
  /** Origin airport codes as searched, e.g. "LHR,LGW". */
  from: string;
  /** Destination airport codes as searched. */
  to: string;
  /** Where the stay was searched, e.g. "Istanbul". */
  destination: string;
  /** Outbound date, "YYYY-MM-DD". */
  departDate: string;
  /** Return date, "YYYY-MM-DD". */
  returnDate: string;
  /** Nights between the two dates. */
  nights: number;
  /** Everyone the prices cover. */
  travellers: number;
  /** ISO currency code. */
  currency: string;
  /** The flight the packages are priced on. */
  flight: FlightOption;
  /** A couple of other itineraries worth a mention. */
  flightAlternatives: FlightOption[];
  /** One package per tier, cheapest first. */
  packages: TripPackage[];
  /** The tier worth leading with. */
  recommended: PackageTier;
  /** Google Flights search URL. */
  flightSearchUrl: string;
  /** Google Hotels search URL. */
  hotelSearchUrl: string;
}
