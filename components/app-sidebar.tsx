"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MagnifyingGlass, Plus, Trash } from "@phosphor-icons/react";
import { useThreads } from "@/hooks/use-threads";
import type { ThreadSummary } from "@/shared/types/thread";
import { Button, Input, Sidebar } from "bruv-ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const GROUP_ORDER = ["today", "yesterday", "previous 7 days", "earlier"] as const;
type GroupKey = (typeof GROUP_ORDER)[number];

function bucket(updatedAt: number): GroupKey {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  if (updatedAt >= startOfToday) return "today";
  if (updatedAt >= startOfToday - 86_400_000) return "yesterday";
  if (updatedAt >= startOfToday - 6 * 86_400_000) return "previous 7 days";
  return "earlier";
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

export function AppSidebar() {
  const { threads, createThread, deleteThread } = useThreads();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const [query, setQuery] = useState("");

  async function newChat() {
    const thread = await createThread({});
    router.push(`/chat/${thread.id}`);
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? threads.filter((t) => t.title.toLowerCase().includes(q))
      : threads;
    const map = new Map<GroupKey, ThreadSummary[]>();
    for (const thread of filtered) {
      const key = bucket(thread.updatedAt);
      const existing = map.get(key) ?? [];
      existing.push(thread);
      map.set(key, existing);
    }
    return map;
  }, [threads, query]);

  const hasResults = Array.from(groups.values()).some((g) => g.length > 0);

  return (
    <Sidebar>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight lowercase"
          >
            bruv
          </Link>
          <ThemeToggle />
        </div>

        <Button
          onClick={newChat}
          variant="outline"
          size="sm"
          iconLeft={<Plus />}
          className="w-full justify-start font-normal"
        >
          new chat
        </Button>

        {threads.length > 0 && (
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search chats…"
            iconLeft={<MagnifyingGlass />}
            size="sm"
          />
        )}

        <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2">
          {GROUP_ORDER.map((key) => {
            const items = groups.get(key);
            if (!items || items.length === 0) return null;
            return (
              <Sidebar.Section key={key}>
                <Sidebar.Label>{key}</Sidebar.Label>
                {items.map((thread) => (
                  <Sidebar.Link
                    key={thread.id}
                    name={thread.title}
                    href={`/chat/${thread.id}`}
                    active={params?.id === thread.id}
                    icon={
                      thread.channel === "slack" ? (
                        <SlackIcon className="size-3 shrink-0" />
                      ) : undefined
                    }
                    trailing={
                      <button
                        type="button"
                        aria-label="Delete chat"
                        className="text-bruv-tertiary hover:text-bruv-primary opacity-0 transition group-hover/link:opacity-100"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await deleteThread(thread.id);
                          if (params?.id === thread.id) router.push("/");
                        }}
                      >
                        <Trash className="size-3.5" />
                      </button>
                    }
                  />
                ))}
              </Sidebar.Section>
            );
          })}
          {threads.length > 0 && !hasResults && (
            <p className="text-bruv-tertiary px-3 py-2 text-xs">
              no chats match "{query}"
            </p>
          )}
        </div>
      </div>

      <div className="pt-1">
        <UserMenu />
      </div>
    </Sidebar>
  );
}
