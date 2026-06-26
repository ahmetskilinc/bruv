"use client";

import { Globe } from "@phosphor-icons/react";

export interface WebSearchOutput {
  query: string;
  answer: string;
  results: { title: string; url: string; snippet: string }[];
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourcesCard({ output }: { output: WebSearchOutput }) {
  const results = output.results ?? [];
  if (results.length === 0) return null;

  return (
    <div className="bg-card w-full max-w-md rounded-xl border p-1 transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs">
        <Globe className="size-3.5" />
        {results.length} sources
      </div>
      <ul className="flex flex-col">
        {results.map((r, i) => (
          <li key={i}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="hover:bg-accent flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
            >
              {/* favicon — external host, plain img is correct */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?domain=${domainOf(r.url)}&sz=32`}
                alt=""
                className="size-4 shrink-0 rounded"
              />
              <span className="flex-1 truncate text-sm">{r.title}</span>
              <span className="text-muted-foreground shrink-0 text-[10px]">
                {domainOf(r.url)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
