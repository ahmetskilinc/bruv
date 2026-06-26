"use client";

import { Lightning, Cloud, Sun } from "@phosphor-icons/react";
import { type ComponentType, type SVGProps } from "react";
import type { WeatherOutput } from "@/shared/tools/weather";
import { cn } from "@/lib/utils";

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  sun: Sun,
  cloud: Cloud,
  "cloud-sun": Cloud,
  "cloud-fog": Cloud,
  "cloud-drizzle": Cloud,
  "cloud-rain": Cloud,
  "cloud-snow": Cloud,
  "cloud-lightning": Lightning,
};

function WeatherIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Cloud;
  return <Icon className={className} />;
}

function shortDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5);
  return date.toLocaleDateString("en", { weekday: "short" });
}

export function WeatherCard({ output }: { output: WeatherOutput }) {
  return (
    <div className="bg-card w-full max-w-sm rounded-xl border p-4 transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{output.location}</p>
          <p className="text-muted-foreground text-xs">{output.condition.text}</p>
        </div>
        <div className="flex items-center gap-2">
          <WeatherIcon
            name={output.condition.icon}
            className="text-muted-foreground size-6"
          />
          <span className="text-3xl font-semibold tabular-nums">
            {output.temperature}°
          </span>
        </div>
      </div>

      <p className="text-muted-foreground mt-1 text-xs tabular-nums">
        H:{output.temperatureHigh}° L:{output.temperatureLow}° · {output.humidity}%
        humidity · {output.windSpeed} km/h wind
      </p>

      {output.dailyForecast.length > 0 && (
        <div className="mt-3 flex justify-between gap-1 border-t pt-3">
          {output.dailyForecast.slice(0, 5).map((day, index) => (
            <div
              key={day.day}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-muted-foreground text-[10px]">
                {index === 0 ? "today" : shortDay(day.day)}
              </span>
              <WeatherIcon
                name={day.condition.icon}
                className={cn("size-4", index === 0 ? "" : "text-muted-foreground")}
              />
              <span className="text-xs tabular-nums">{day.high}°</span>
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {day.low}°
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
