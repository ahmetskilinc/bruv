"use client";

import { AirplaneTakeoff, ArrowRight, ArrowSquareOut, Leaf } from "@phosphor-icons/react";
import type { FlightOption, FlightSearchOutput } from "@/shared/tools/flights";
import {
  dayOffset,
  formatDay,
  formatDuration,
  formatPrice,
  stopsLabel,
  timeOf,
} from "./travel-format";
import { cn } from "@/lib/utils";

const MAX_SHOWN = 5;

function FlightRow({ option }: { option: FlightOption }) {
  const first = option.segments.at(0);
  const last = option.segments.at(-1);
  if (!first || !last) return null;

  const plus = dayOffset(first.departsAt, last.arrivesAt);
  const airlines = [...new Set(option.segments.map((segment) => segment.airline))];
  const via = option.layovers.map((layover) => layover.code).filter(Boolean);

  return (
    <div className="hover:bg-accent/50 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors">
      {first.airlineLogo ? (
        // Google's logo CDN, not in next.config images — plain img keeps it simple.
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
            <span className="text-muted-foreground text-[10px] align-super">+{plus}</span>
          )}
          <span className="text-muted-foreground truncate text-xs">
            {airlines.join(" · ")}
          </span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {first.fromCode}–{last.toCode} · {formatDuration(option.totalDurationMinutes)} ·{" "}
          <span className={cn(option.stops === 0 && "text-brand")}>
            {stopsLabel(option.stops)}
          </span>
          {via.length > 0 && <span> via {via.join(", ")}</span>}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">
          {formatPrice(option.price, option.currency)}
        </p>
        {typeof option.emissionsDeltaPercent === "number" &&
          option.emissionsDeltaPercent <= -10 && (
            <p className="text-brand flex items-center justify-end gap-0.5 text-[10px]">
              <Leaf className="size-3" />
              {option.emissionsDeltaPercent}% CO₂
            </p>
          )}
      </div>
    </div>
  );
}

export function FlightListCard({ output }: { output: FlightSearchOutput }) {
  const options = output.options ?? [];
  const shown = options.slice(0, MAX_SHOWN);
  const roundTrip = output.tripType === "round-trip";

  return (
    <div className="bg-card w-full max-w-md rounded-xl border p-1 transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <AirplaneTakeoff className="text-muted-foreground size-3.5 shrink-0" />
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          {output.from} → {output.to} · {formatDay(output.departDate)}
          {output.returnDate && `–${formatDay(output.returnDate)}`} ·{" "}
          {output.passengers} pax
        </p>
        {output.priceLevel && (
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[10px] capitalize",
              output.priceLevel === "low"
                ? "text-brand border-brand/30"
                : "text-muted-foreground"
            )}
          >
            {output.priceLevel} price
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {shown.map((option, index) => (
          <FlightRow key={`${option.price}-${index}`} option={option} />
        ))}
      </div>

      <div className="text-muted-foreground flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span>
          {roundTrip ? "outbound shown, price is the return total" : "one way"}
          {options.length > shown.length && ` · +${options.length - shown.length} more`}
        </span>
        {output.searchUrl && (
          <a
            href={output.searchUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground flex shrink-0 items-center gap-1 transition-colors"
          >
            google flights
            <ArrowSquareOut className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}
