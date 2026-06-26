"use client";

import { Folder, Lock } from "@phosphor-icons/react";

interface Repo {
  name: string;
  private: boolean;
  description: string | null;
  pushedAt: string | null;
  url: string;
}

export interface RepoListOutput {
  total: number;
  repos: Repo[];
}

const MAX_SHOWN = 8;

export function RepoListCard({ output }: { output: RepoListOutput }) {
  const repos = output.repos ?? [];
  const shown = repos.slice(0, MAX_SHOWN);

  return (
    <div className="bg-card w-full max-w-md rounded-xl border p-1 transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs">
        <Folder className="size-3.5" />
        {output.total} {output.total === 1 ? "repository" : "repositories"}
      </div>
      <ul className="flex flex-col">
        {shown.map((repo) => (
          <li key={repo.name}>
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="hover:bg-accent flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="truncate font-mono text-xs">{repo.name}</span>
              {repo.private && (
                <Lock className="text-muted-foreground ml-auto size-3 shrink-0" />
              )}
            </a>
          </li>
        ))}
      </ul>
      {repos.length > shown.length && (
        <p className="text-muted-foreground px-3 py-1.5 text-xs">
          +{repos.length - shown.length} more
        </p>
      )}
    </div>
  );
}
