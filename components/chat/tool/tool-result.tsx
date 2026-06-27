"use client";

import { CaretRight, Wrench } from "@phosphor-icons/react";
import { Collapsible } from "bruv-ui";
import { Markdown } from "../markdown";

// Best-effort extraction of human-readable text from a tool result. MCP
// connection tools return `{ content: [{ type: "text", text }] }`; authored
// tools may return a string or arbitrary JSON.
function extractText(output: unknown): string {
  if (typeof output === "string") return output;

  if (output && typeof output === "object") {
    const record = output as { content?: unknown };
    if (Array.isArray(record.content)) {
      const text = record.content
        .filter(
          (c): c is { type: string; text: string } =>
            !!c &&
            typeof c === "object" &&
            (c as { type?: unknown }).type === "text" &&
            typeof (c as { text?: unknown }).text === "string",
        )
        .map((c) => c.text)
        .join("\n\n");
      if (text.trim()) return text;
    }
  }

  try {
    return `\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``;
  } catch {
    return String(output);
  }
}

export function ToolResult({ name, output }: { name: string; output: unknown }) {
  return (
    <Collapsible.Root className="bg-card w-full max-w-md rounded-xl border transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-300">
      <Collapsible.Trigger className="text-muted-foreground hover:text-foreground group flex w-full items-center gap-1.5 px-3 py-2 text-xs transition-colors">
        <Wrench className="size-3.5" />
        <span className="font-mono">used {name}</span>
        <CaretRight className="ml-auto size-3 transition-transform group-data-[panel-open]:rotate-90" />
      </Collapsible.Trigger>
      <Collapsible.Panel className="border-t px-3 py-2 text-xs">
        <Markdown>{extractText(output)}</Markdown>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
