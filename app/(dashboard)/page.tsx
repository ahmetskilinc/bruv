"use client";

import { useRouter } from "next/navigation";
import {
  CodeBlock,
  ListBullets,
  Cloud,
  Sparkle,
} from "@phosphor-icons/react";
import { useThreads } from "@/hooks/use-threads";
import { useSession } from "@/lib/auth-client";
import { Composer } from "@/components/chat/composer";

const SUGGESTIONS = [
  { label: "show me my open PRs", icon: CodeBlock },
  { label: "what's on my Linear?", icon: ListBullets },
  { label: "weather in london", icon: Cloud },
  { label: "draw me something stupid", icon: Sparkle },
];

// bruv-voice subtitles, picked by a stable per-load index (no hydration mismatch
// because the array is read once on the client after mount).
const SUBTITLES = [
  "what's the damage?",
  "what do you need?",
  "go on then.",
  "what are we breaking today?",
  "talk to me.",
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return { word: "still up", emoji: "🦉" };
  if (h < 12) return { word: "morning", emoji: "☀️" };
  if (h < 18) return { word: "afternoon", emoji: "👋" };
  return { word: "evening", emoji: "🌙" };
}

export default function Home() {
  const { createThread } = useThreads();
  const { data: session } = useSession();
  const router = useRouter();

  const { word, emoji } = greeting();
  const firstName = session?.user?.name?.split(" ")[0]?.toLowerCase();
  const subtitle =
    SUBTITLES[Math.floor((Date.now() / 60000) % SUBTITLES.length)];

  async function start(text: string) {
    const thread = await createThread({ title: text });
    sessionStorage.setItem(`pending:${thread.id}`, text);
    router.push(`/chat/${thread.id}`);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-7 px-4">
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col items-center gap-1.5 text-center duration-500">
        <h1 className="text-2xl font-semibold tracking-tight lowercase">
          {word}
          {firstName ? `, ${firstName}` : ""} {emoji}
        </h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-3 w-full duration-500">
        <Composer onSend={start} onStop={() => {}} isBusy={false} autoFocus />
      </div>

      <div className="animate-in fade-in flex flex-wrap justify-center gap-2 delay-150 duration-700">
        {SUGGESTIONS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => start(label)}
            className="text-muted-foreground hover:text-foreground hover:border-foreground/20 border-border flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
