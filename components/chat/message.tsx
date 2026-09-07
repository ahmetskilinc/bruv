"use client";

import type {
  EveDynamicToolPart,
  EveMessage,
  EveMessageInputRequest,
  EveMessagePart,
} from "eve/react";
import type { InputResponse } from "eve/client";
import { memo, useState } from "react";
import {
  ArrowsClockwise,
  Check,
  Clipboard,
  Wrench,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { WeatherOutput } from "@/shared/tools/weather";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Button } from "@/components/ui/button";
import { WeatherCard } from "./tool/weather-card";
import { RepoListCard, type RepoListOutput } from "./tool/repo-list-card";
import { PrListCard, type PrListOutput } from "./tool/pr-list-card";
import { ImageCard, type ImageOutput } from "./tool/image-card";
import { FortniteCard, type FortniteOutput } from "./tool/fortnite-card";
import { SourcesCard, type WebSearchOutput } from "./tool/sources-card";
import { DiffCard } from "./tool/diff-card";
import { FlightListCard } from "./tool/flight-list-card";
import { HotelListCard } from "./tool/hotel-list-card";
import { PackageCard } from "./tool/package-card";
import type { ShowDiffOutput } from "@/shared/tools/show_diff";
import type { FlightSearchOutput } from "@/shared/tools/flights";
import type { HotelSearchOutput } from "@/shared/tools/hotels";
import type { TripPlanOutput } from "@/shared/tools/package";
import { ToolResult } from "./tool/tool-result";
import { ToolError } from "./tool/tool-error";

export function ChatMessage({
  message,
  onRespond,
  canRespond,
}: {
  message: EveMessage;
  onRespond: (responses: InputResponse[]) => void;
  canRespond: boolean;
}) {
  if (message.role === "user") {
    const text = message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim();
    return (
      <Message
        align="end"
        className="animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <MessageContent>
          <Bubble variant="brand">
            <BubbleContent className="whitespace-pre-wrap">{text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  const replyText = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

  return (
    <Message
      align="start"
      className="animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <MessageContent>
        {message.parts.map((part, index) => (
          <Part
            key={index}
            part={part}
            onRespond={onRespond}
            canRespond={canRespond}
          />
        ))}
      </MessageContent>
      {replyText && <CopyButton text={replyText} />}
    </Message>
  );
}

const streamdownPlugins = { cjk, code };

// Markdown renderer for assistant text (replaces ai-elements MessageResponse);
// memoized so streaming re-renders stay cheap.
const Response = memo(
  ({ text }: { text: string }) => (
    <Streamdown
      className="chat-prose size-full"
      plugins={streamdownPlugins}
    >
      {text}
    </Streamdown>
  ),
  (prev, next) => prev.text === next.text
);
Response.displayName = "Response";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy reply"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted-foreground hover:text-foreground -mt-1 flex w-fit items-center gap-1 rounded-md px-1.5 py-1 text-xs opacity-0 transition group-hover/message:opacity-100"
    >
      {copied ? (
        <Check className="size-3.5" />
      ) : (
        <Clipboard className="size-3.5" />
      )}
      {copied ? "copied" : "copy"}
    </button>
  );
}

function Part({
  part,
  onRespond,
  canRespond,
}: {
  part: EveMessagePart;
  onRespond: (responses: InputResponse[]) => void;
  canRespond: boolean;
}) {
  if (part.type === "text") {
    return part.text ? (
      <Bubble variant="muted">
        <BubbleContent>
          <Response text={part.text} />
        </BubbleContent>
      </Bubble>
    ) : null;
  }
  if (part.type === "reasoning") {
    return part.text ? (
      <Reasoning isStreaming={part.state === "streaming"}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    ) : null;
  }
  if (part.type === "dynamic-tool") {
    return <ToolPart part={part} onRespond={onRespond} canRespond={canRespond} />;
  }
  return null;
}

/** Tools signal failure by returning `{ error }` rather than throwing. */
function errorOf(output: unknown): string | undefined {
  const value = (output as { error?: unknown } | null | undefined)?.error;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// Tool name -> card. Adding a tool is one line here; the shared error check in
// ToolPart means a new entry cannot forget to handle its own failure case.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entry
// narrows its own output; the table itself is heterogeneous by nature.
const TOOL_CARDS: Record<string, (output: any) => React.ReactNode> = {
  weather: (output: WeatherOutput) => <WeatherCard output={output} />,
  list_repos: (output: RepoListOutput) => <RepoListCard output={output} />,
  list_prs: (output: PrListOutput) => <PrListCard output={output} />,
  generate_image: (output: ImageOutput) => <ImageCard output={output} />,
  fortnite_stats: (output: FortniteOutput) => <FortniteCard output={output} />,
  web_search: (output: WebSearchOutput) => <SourcesCard output={output} />,
  plan_trip: (output: TripPlanOutput) => <PackageCard output={output} />,
  find_flights: (output: FlightSearchOutput) => <FlightListCard output={output} />,
  find_hotels: (output: HotelSearchOutput) => <HotelListCard output={output} />,
  show_diff: (output: ShowDiffOutput) => <DiffCard output={output} />,
};

function ToolPart({
  part,
  onRespond,
  canRespond,
}: {
  part: EveDynamicToolPart;
  onRespond: (responses: InputResponse[]) => void;
  canRespond: boolean;
}) {
  const name = part.toolMetadata?.eve?.name ?? part.toolName;
  const request = part.toolMetadata?.eve?.inputRequest;

  if (part.state === "approval-requested" && request) {
    return (
      <ApprovalRequest
        request={request}
        onRespond={onRespond}
        canRespond={canRespond}
      />
    );
  }

  if (part.state === "output-available") {
    // One error check for every tool. Previously each branch decided for itself,
    // which is how web_search and fortnite_stats ended up rendering `null`, and
    // how list_repos/list_prs ended up feeding an {error} object into a card
    // that then displayed "undefined repositories".
    const failure = errorOf(part.output);
    if (failure) {
      return <ToolError message={failure} />;
    }

    const card = TOOL_CARDS[name];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the table
    // is keyed by tool name; each entry knows its own output shape.
    return card ? card(part.output as any) : <ToolResult name={name} output={part.output} />;
  }

  const isError = part.state === "output-error";
  const isDenied = part.state === "output-denied";
  const running = !isError && !isDenied;
  // eve carries the reason on the part; without these a thrown tool shows only
  // "weather failed", and a policy-denied call shows only "save_memory skipped".
  const detail = isError ? part.errorText : isDenied ? part.approval?.reason : undefined;
  const label = isError
    ? `${name} failed`
    : isDenied
      ? `${name} skipped`
      : `${RUNNING_LABELS[name] ?? name}…`;

  return (
    <div className="animate-in fade-in flex flex-col items-start gap-1 duration-300">
      <div
        className={cn(
          "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
          isError
            ? "text-destructive border-destructive/30"
            : "text-muted-foreground bg-muted/40"
        )}
      >
        {running ? (
          <ArrowsClockwise className="text-brand size-3.5 animate-spin" />
        ) : (
          <Wrench className="size-3.5" />
        )}
        <span>{label}</span>
      </div>
      {detail && <ToolError message={detail} />}
    </div>
  );
}

// friendly, in-voice labels while a tool is mid-flight (falls back to the raw
// tool name for anything unmapped).
const RUNNING_LABELS: Record<string, string> = {
  weather: "checking the weather",
  list_repos: "pulling your repos",
  list_prs: "finding your prs",
  generate_image: "painting something",
  fortnite_stats: "loading fortnite stats",
  web_search: "searching the web",
  save_memory: "saving to memory",
  show_diff: "reading the diff",
  open_pull_request: "opening the pr",
  plan_trip: "planning the trip",
  find_flights: "searching flights",
  find_hotels: "finding places to stay",
};

function ApprovalRequest({
  request,
  onRespond,
  canRespond,
}: {
  request: EveMessageInputRequest;
  onRespond: (responses: InputResponse[]) => void;
  canRespond: boolean;
}) {
  const options =
    request.options && request.options.length > 0
      ? request.options
      : [
          { id: "approve", label: "Approve", style: "primary" as const },
          { id: "deny", label: "Deny", style: "default" as const },
        ];

  return (
    <div className="bg-card flex max-w-md flex-col gap-3 rounded-xl border p-3.5">
      <p className="text-sm">{request.prompt}</p>
      {canRespond && (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={
                option.style === "danger"
                  ? "destructive"
                  : option.style === "primary"
                    ? "default"
                    : "outline"
              }
              onClick={() =>
                onRespond([{ requestId: request.requestId, optionId: option.id }])
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
