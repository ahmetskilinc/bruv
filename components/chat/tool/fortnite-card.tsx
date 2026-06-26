"use client";

import { Trophy } from "@phosphor-icons/react";

export interface FortniteOutput {
  name: string;
  level: number | null;
  wins: number;
  kd: number;
  kills: number;
  matches: number;
  winRate: number;
  killsPerMatch: number;
}

export function FortniteCard({ output }: { output: FortniteOutput }) {
  const stats = [
    { label: "wins", value: output.wins.toLocaleString() },
    { label: "K/D", value: output.kd.toFixed(2) },
    { label: "kills", value: output.kills.toLocaleString() },
    { label: "matches", value: output.matches.toLocaleString() },
    { label: "win rate", value: `${output.winRate.toFixed(1)}%` },
    { label: "kills/match", value: output.killsPerMatch.toFixed(2) },
  ];

  return (
    <div className="bg-card w-full max-w-sm rounded-xl border p-4 transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">{output.name}</span>
        </div>
        {output.level != null && (
          <span className="text-muted-foreground text-xs">level {output.level}</span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-lg font-semibold tabular-nums">{s.value}</div>
            <div className="text-muted-foreground text-[10px]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
