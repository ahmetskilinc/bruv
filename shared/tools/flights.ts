// Output shape for the `find_flights` tool, shared between the agent tool and
// the chat card so they stay in sync.

export interface FlightSegment {
  /** Airline name, e.g. "British Airways". */
  airline: string;
  /** Airline logo URL from Google. */
  airlineLogo: string;
  /** Marketing flight number, e.g. "BA 676". */
  flightNumber: string;
  /** IATA code of the origin airport for this leg. */
  fromCode: string;
  /** Full name of the origin airport. */
  fromName: string;
  /** Local departure time, "YYYY-MM-DD HH:MM". */
  departsAt: string;
  /** IATA code of the destination airport for this leg. */
  toCode: string;
  /** Full name of the destination airport. */
  toName: string;
  /** Local arrival time, "YYYY-MM-DD HH:MM". */
  arrivesAt: string;
  /** Leg duration in minutes. */
  durationMinutes: number;
  /** Cabin, e.g. "Economy". */
  cabin: string;
  /** Aircraft type, when Google reports one. */
  aircraft?: string;
  /** True when the leg departs one day and lands the next. */
  overnight?: boolean;
}

export interface FlightLayover {
  /** Airport name. */
  name: string;
  /** IATA code. */
  code: string;
  /** Connection time in minutes. */
  durationMinutes: number;
  /** True when the layover spans a night. */
  overnight?: boolean;
}

export interface FlightOption {
  /** Price as Google quotes it for this search — the party total, in `currency`. */
  price: number;
  /** ISO currency code the price is quoted in. */
  currency: string;
  /** Door-to-door duration in minutes, including layovers. */
  totalDurationMinutes: number;
  /** Number of stops (0 = direct). */
  stops: number;
  /**
   * Each flown leg, in order. On a round-trip search Google returns the
   * OUTBOUND itinerary only, priced at the round-trip total — the return legs
   * need a follow-up request, so treat these as the outbound journey.
   */
  segments: FlightSegment[];
  /** Connections between legs, in order. */
  layovers: FlightLayover[];
  /** True when Google ranked this among its "best" results. */
  best: boolean;
  /** Percent difference vs. the typical emissions for this route. */
  emissionsDeltaPercent?: number;
}

export interface FlightSearchOutput {
  /** Origin as searched, e.g. "LON". */
  from: string;
  /** Destination as searched, e.g. "LIS". */
  to: string;
  /** Outbound date, "YYYY-MM-DD". */
  departDate: string;
  /** Return date for round trips; absent for one-ways. */
  returnDate?: string;
  /** Total passengers the price covers. */
  passengers: number;
  /** ISO currency code. */
  currency: string;
  /** Whether this was a one-way or round-trip search. */
  tripType: "one-way" | "round-trip";
  /** Ranked itineraries, cheapest-first within Google's "best" set. */
  options: FlightOption[];
  /** Google's read on the price, e.g. "low" | "typical" | "high". */
  priceLevel?: string;
  /** The usual price range for this route, in `currency`. */
  typicalPriceRange?: [number, number];
  /** Google Flights search URL, so the user can keep browsing. */
  searchUrl: string;
}
