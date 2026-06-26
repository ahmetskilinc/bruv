"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { FileText } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ShowDiffOutput } from "@/shared/tools/show_diff";

// @pierre/diffs renders into a web component (touches `document`/customElements),
// so load it browser-only to keep it out of SSR.
const PatchDiff = dynamic(
  () => import("@pierre/diffs/react").then((m) => m.PatchDiff),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground px-3 py-2 text-xs">rendering diff…</div>
    ),
  },
);

// PatchDiff is third-party and can throw on certain patches; without a boundary
// that crash bubbles up and takes the whole message (and page) down. Contain it
// here and fall back to a plain rendered patch so the user still sees the diff.
class DiffErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("PatchDiff render failed, falling back to plain diff:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// Minimal, dependency-free unified-diff renderer used when PatchDiff fails.
function lineClass(line: string): string {
  if (line.startsWith("@@")) return "text-sky-600 dark:text-sky-400";
  if (
    line.startsWith("+++") ||
    line.startsWith("---") ||
    line.startsWith("diff ") ||
    line.startsWith("index ") ||
    line.startsWith("new file") ||
    line.startsWith("deleted file") ||
    line.startsWith("rename ")
  ) {
    return "text-muted-foreground";
  }
  if (line.startsWith("+"))
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (line.startsWith("-"))
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "text-foreground/80";
}

function PlainDiff({ patch }: { patch: string }) {
  return (
    <pre className="overflow-x-auto text-[11px] leading-relaxed">
      <code className="block py-1 font-mono">
        {patch.split("\n").map((line, i) => (
          <span
            key={i}
            className={cn("block px-3 whitespace-pre", lineClass(line))}
          >
            {line || " "}
          </span>
        ))}
      </code>
    </pre>
  );
}

// PatchDiff renders exactly ONE file ("Provided patch must contain exactly 1
// file diff"), so split a multi-file `git diff` on its per-file "diff --git"
// headers and render one PatchDiff per file.
function splitPatchByFile(patch: string): string[] {
  return patch
    .split(/(?=^diff --git )/m)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function DiffCard({ output }: { output: ShowDiffOutput }) {
  if (output.empty) {
    return (
      <div className="bg-card text-muted-foreground flex w-full max-w-md items-center gap-1.5 rounded-xl border px-3 py-2 text-xs animate-in fade-in slide-in-from-bottom-1 duration-300">
        <FileText className="size-3.5" />
        no changes in {output.dir === "." ? "the workspace" : output.dir}
      </div>
    );
  }

  const filePatches = splitPatchByFile(output.patch);
  // Fall back to one block if we couldn't find file boundaries.
  const patches = filePatches.length > 0 ? filePatches : [output.patch];

  return (
    <div className="bg-card w-full overflow-hidden rounded-xl border transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* @pierre/diffs draws its own per-file headers + syntax-highlighted diff.
          Each file is guarded so one bad patch can't break the others. */}
      {patches.map((filePatch, i) => (
        <div key={i} className={cn(i > 0 && "border-t")}>
          <DiffErrorBoundary fallback={<PlainDiff patch={filePatch} />}>
            <PatchDiff
              patch={filePatch}
              options={{ overflow: "scroll" }}
              disableWorkerPool
            />
          </DiffErrorBoundary>
        </div>
      ))}
      {output.truncated && (
        <p className="text-muted-foreground border-t px-3 py-1.5 text-xs">
          diff truncated — open the PR to see the rest
        </p>
      )}
    </div>
  );
}
