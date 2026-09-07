"use client";

import { Warning } from "@phosphor-icons/react";

// Tool failures used to render as `null`, so a failed search left the user
// staring at nothing. Show the message the tool actually returned instead.
export function ToolError({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground border-destructive/25 flex w-fit max-w-md items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs animate-in fade-in duration-300">
      <Warning className="text-destructive mt-px size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
