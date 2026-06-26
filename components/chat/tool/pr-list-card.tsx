"use client";

import { ArrowsLeftRight } from "@phosphor-icons/react";

interface Pr {
  repo: string;
  number: number;
  title: string;
  draft: boolean;
  author: string;
  url: string;
}

export interface PrListOutput {
  total: number;
  totalIncludingBots?: number;
  prs: Pr[];
}

const MAX_SHOWN = 12;

function repoName(fullName: string) {
  return fullName.split("/").pop() ?? fullName;
}

export function PrListCard({ output }: { output: PrListOutput }) {
  const prs = output.prs ?? [];
  const shown = prs.slice(0, MAX_SHOWN);
  const hidden =
    output.totalIncludingBots && output.totalIncludingBots > output.total
      ? output.totalIncludingBots - output.total
      : 0;

  return (
    <div className="bg-card w-full max-w-md rounded-xl border p-1 transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs">
        <ArrowsLeftRight className="size-3.5" />
        {output.total} open PR{output.total === 1 ? "" : "s"}
        {hidden > 0 && (
          <span className="opacity-70">· {hidden} dependency bumps hidden</span>
        )}
      </div>
      <ul className="flex flex-col">
        {shown.map((pr) => (
          <li key={`${pr.repo}#${pr.number}`}>
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="hover:bg-accent flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
            >
              <span className="text-muted-foreground shrink-0 font-mono text-xs">
                #{pr.number}
              </span>
              <span className="flex-1 truncate text-sm">{pr.title}</span>
              {pr.draft && (
                <span className="text-muted-foreground border-border shrink-0 rounded border px-1 text-[10px]">
                  draft
                </span>
              )}
              <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
                {repoName(pr.repo)}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {prs.length > shown.length && (
        <p className="text-muted-foreground px-3 py-1.5 text-xs">
          +{prs.length - shown.length} more
        </p>
      )}
    </div>
  );
}
