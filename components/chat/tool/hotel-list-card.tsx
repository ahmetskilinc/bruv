"use client";

import { ArrowSquareOut, Buildings, Star } from "@phosphor-icons/react";
import type { HotelOption, HotelSearchOutput } from "@/shared/tools/hotels";

const MAX_SHOWN = 6;

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

function HotelRow({ hotel, currency }: { hotel: HotelOption; currency: string }) {
  const price = hotel.pricePerNight ?? hotel.totalPrice;
  const perNight = hotel.pricePerNight !== undefined;

  const body = (
    <>
      {hotel.image ? (
        // Google's image CDN isn't configured in next.config images.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hotel.image}
          alt=""
          className="bg-muted size-11 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-md">
          <Buildings className="text-muted-foreground size-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{hotel.name}</p>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
          {hotel.rating !== undefined && (
            <>
              <Star weight="fill" className="size-3 text-amber-500" />
              <span className="tabular-nums">{hotel.rating.toFixed(1)}</span>
              {hotel.reviews !== undefined && (
                <span className="opacity-70">({hotel.reviews.toLocaleString()})</span>
              )}
            </>
          )}
          {hotel.stars !== undefined && <span>· {hotel.stars}-star</span>}
          {hotel.amenities.length > 0 && (
            <span className="truncate opacity-70">· {hotel.amenities[0]}</span>
          )}
        </p>
      </div>

      {price !== undefined && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatPrice(price, currency)}
          </p>
          <p className="text-muted-foreground text-[10px]">
            {perNight ? "per night" : "total"}
          </p>
        </div>
      )}
    </>
  );

  const className =
    "hover:bg-accent/50 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors";

  return hotel.url ? (
    <a href={hotel.url} target="_blank" rel="noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function HotelListCard({ output }: { output: HotelSearchOutput }) {
  const options = output.options ?? [];
  const shown = options.slice(0, MAX_SHOWN);
  const guests = output.adults + output.children;

  return (
    <div className="bg-card w-full max-w-md rounded-xl border p-1 transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs">
        <Buildings className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {output.location} · {formatDay(output.checkIn)}–{formatDay(output.checkOut)} ·{" "}
          {output.nights} night{output.nights === 1 ? "" : "s"} · {guests} guest
          {guests === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col">
        {shown.map((hotel, index) => (
          <HotelRow key={`${hotel.name}-${index}`} hotel={hotel} currency={output.currency} />
        ))}
      </div>

      <div className="text-muted-foreground flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span>
          {options.length > shown.length ? `+${options.length - shown.length} more` : ""}
        </span>
        {output.searchUrl && (
          <a
            href={output.searchUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground flex shrink-0 items-center gap-1 transition-colors"
          >
            google hotels
            <ArrowSquareOut className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}
