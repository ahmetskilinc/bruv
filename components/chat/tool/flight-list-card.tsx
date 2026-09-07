"use client";

import { AirplaneTakeoff, ArrowRight, ArrowSquareOut, Leaf } from "@phosphor-icons/react";
import type { FlightOption, FlightSearchOutput } from "@/shared/tools/flights";
import { cn } from "@/lib/utils";

const MAX_SHOWN = 5;

function formatDuration(minutes: number) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest ? `${rest}m` : ""}`.trim() : `${rest}m`;
}

/** "2026-10-12 07:15" -> "07:15". Falls back to the raw string if unparsed. */
function timeOf(value: string) {
  const match = /\d{2}:\d{2}/u.exec(value);
  return match?.[0] ?? value;
}

function dateOf(value: string) {
  return value.slice(0, 10);
}

/** Google shows "+1" when the flight lands on a later calendar day. */
function dayOffset(option: FlightOption) {
  const first = option.segments.at(0);
  const last = option.segments.at(-1);
  if (!first?.departsAt || !last?.arrivesAt) return 0;
  const from = new Date(`${dateOf(first.departsAt)}T00:00:00Z`).getTime();
  const to = new Date(`${dateOf(last.arrivesAt)}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

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

function stopsLabel(stops: number) {
  if (stops === 0) return "direct";
  return `${stops} stop${stops === 1 ? "" : "s"}`;
}

function FlightRow({ option }: { option: FlightOption }) {
  const first = option.segments.at(0);
  const last = option.segments.at(-1);
  if (!first || !last) return null;

  const plus = dayOffset(option);
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
