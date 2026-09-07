"use client";

import {
  AirplaneTakeoff,
  ArrowRight,
  ArrowSquareOut,
  Buildings,
  Star,
} from "@phosphor-icons/react";
import type { TripPackage, TripPlanOutput } from "@/shared/tools/package";
import {
  dayOffset,
  formatDay,
  formatDuration,
  formatPrice,
  stopsLabel,
  timeOf,
} from "./travel-format";
import { cn } from "@/lib/utils";

function FlightStrip({ output }: { output: TripPlanOutput }) {
  const { flight } = output;
  const first = flight.segments.at(0);
  const last = flight.segments.at(-1);
  if (!first || !last) return null;

  const plus = dayOffset(first.departsAt, last.arrivesAt);
  const airlines = [...new Set(flight.segments.map((segment) => segment.airline))];

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {first.airlineLogo ? (
        // Google's logo CDN isn't configured in next.config images.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={first.airlineLogo}
          alt=""
          className="size-6 shrink-0 rounded bg-white object-contain"
        />
      ) : (
        <AirplaneTakeoff className="text-muted-foreground size-6 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5 text-sm tabular-nums">
          <span className="font-medium">{timeOf(first.departsAt)}</span>
          <ArrowRight className="text-muted-foreground size-3" />
          <span className="font-medium">{timeOf(last.arrivesAt)}</span>
          {plus > 0 && (
            <span className="text-muted-foreground align-super text-[10px]">+{plus}</span>
          )}
          <span className="text-muted-foreground truncate text-xs">
            {airlines.join(" · ")}
          </span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {first.fromCode}–{last.toCode} · {formatDuration(flight.totalDurationMinutes)} ·{" "}
          <span className={cn(flight.stops === 0 && "text-brand")}>
            {stopsLabel(flight.stops)}
          </span>
        </p>
      </div>

      <p className="shrink-0 text-sm font-semibold tabular-nums">
        {formatPrice(flight.price, output.currency)}
      </p>
    </div>
  );
}

function PackageRow({
  entry,
  output,
  recommended,
}: {
  entry: TripPackage;
  output: TripPlanOutput;
  recommended: boolean;
}) {
  const { hotel } = entry;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 transition-colors",
        recommended ? "border-brand/40 bg-brand/5" : "border-transparent hover:bg-accent/40"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            recommended ? "text-brand" : "text-muted-foreground"
          )}
        >
          {entry.label}
        </span>
        {recommended && (
          <span className="border-brand/30 text-brand rounded border px-1 text-[9px]">
            pick
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-3">
        {hotel.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.image}
            alt=""
            className="bg-muted size-10 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
            <Buildings className="text-muted-foreground size-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {hotel.url ? (
            <a
              href={hotel.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand block truncate text-sm font-medium transition-colors"
            >
              {hotel.name}
            </a>
          ) : (
            <p className="truncate text-sm font-medium">{hotel.name}</p>
          )}
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
            {hotel.rating !== undefined && (
              <>
                <Star weight="fill" className="size-3 text-amber-500" />
                <span className="tabular-nums">{hotel.rating.toFixed(1)}</span>
              </>
            )}
            {hotel.stars !== undefined && <span>· {hotel.stars}★</span>}
            <span>
              · {formatPrice(entry.hotelTotal, output.currency)} for {output.nights}n
            </span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums">
            {formatPrice(entry.total, output.currency)}
          </p>
          <p className="text-muted-foreground text-[10px] tabular-nums">
            {formatPrice(entry.perPerson, output.currency)}pp
          </p>
        </div>
      </div>
    </div>
  );
}

export function PackageCard({ output }: { output: TripPlanOutput }) {
  const packages = output.packages ?? [];

  return (
    <div className="bg-card w-full max-w-md rounded-xl border p-1 transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs">
        <AirplaneTakeoff className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {output.destination} · {formatDay(output.departDate)}–
          {formatDay(output.returnDate)} · {output.nights} night
          {output.nights === 1 ? "" : "s"} · {output.travellers} traveller
          {output.travellers === 1 ? "" : "s"}
        </span>
      </div>

      <div className="bg-muted/30 mx-1 rounded-lg">
        <FlightStrip output={output} />
      </div>

      <div className="mt-1 flex flex-col gap-0.5 p-0.5">
        {packages.map((entry) => (
          <PackageRow
            key={entry.tier}
            entry={entry}
            output={output}
            recommended={entry.tier === output.recommended}
          />
        ))}
      </div>

      <div className="text-muted-foreground flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span>flights + stay, all travellers</span>
        <span className="flex shrink-0 items-center gap-2">
          {output.flightSearchUrl && (
            <a
              href={output.flightSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              flights
              <ArrowSquareOut className="size-3" />
            </a>
          )}
          {output.hotelSearchUrl && (
            <a
              href={output.hotelSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              stays
              <ArrowSquareOut className="size-3" />
            </a>
          )}
        </span>
      </div>
    </div>
  );
}
