// Output shape for the `find_hotels` tool, shared between the agent tool and
// the chat card so they stay in sync.

export interface HotelOption {
  /** Property name. */
  name: string;
  /** "hotel" or "vacation rental". */
  type: string;
  /** Nightly rate in `currency`, before taxes and fees where Google splits it. */
  pricePerNight?: number;
  /** Total for the whole stay, all rooms, in `currency`. */
  totalPrice?: number;
  /** Guest rating out of 5. */
  rating?: number;
  /** Number of reviews behind `rating`. */
  reviews?: number;
  /** Star rating, 2–5, when Google reports one. */
  stars?: number;
  /** Separate 0–5 score for how well located the property is. */
  locationRating?: number;
  /** Thumbnail image URL. */
  image?: string;
  /** Booking / property link. */
  url?: string;
  /** Amenity labels, trimmed to the notable ones. */
  amenities: string[];
  /** Local check-in time, e.g. "3:00 PM". */
  checkInTime?: string;
  /** Local check-out time, e.g. "11:00 AM". */
  checkOutTime?: string;
}

export interface HotelSearchOutput {
  /** City or area as searched. */
  location: string;
  /** Check-in date, "YYYY-MM-DD". */
  checkIn: string;
  /** Check-out date, "YYYY-MM-DD". */
  checkOut: string;
  /** Nights between check-in and check-out. */
  nights: number;
  /** Adults the quote covers. */
  adults: number;
  /** Children the quote covers. */
  children: number;
  /** ISO currency code. */
  currency: string;
  /** Ranked properties. */
  options: HotelOption[];
  /** Google Hotels search URL, so the user can keep browsing. */
  searchUrl: string;
}
