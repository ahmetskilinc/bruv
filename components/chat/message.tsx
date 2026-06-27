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
import { Message, MessageContent, Bubble, BubbleContent, Button } from "bruv-ui";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { WeatherCard } from "./tool/weather-card";
import { RepoListCard, type RepoListOutput } from "./tool/repo-list-card";
import { PrListCard, type PrListOutput } from "./tool/pr-list-card";
import { ImageCard, type ImageOutput } from "./tool/image-card";
import { FortniteCard, type FortniteOutput } from "./tool/fortnite-card";
import { SourcesCard, type WebSearchOutput } from "./tool/sources-card";
import { DiffCard } from "./tool/diff-card";
import type { ShowDiffOutput } from "@/shared/tools/show_diff";
import { ToolResult } from "./tool/tool-result";

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
          <Bubble variant="default">
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
      className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
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
    if (name === "weather") {
      return <WeatherCard output={part.output as WeatherOutput} />;
    }
    if (name === "list_repos") {
      return <RepoListCard output={part.output as RepoListOutput} />;
    }
    if (name === "list_prs") {
      return <PrListCard output={part.output as PrListOutput} />;
    }
    if (name === "generate_image") {
      return <ImageCard output={part.output as ImageOutput} />;
    }
    if (name === "fortnite_stats") {
      const out = part.output as FortniteOutput & { error?: string };
      return out?.error ? null : <FortniteCard output={out} />;
    }
    if (name === "web_search") {
      const out = part.output as WebSearchOutput & { error?: string };
      return out?.error ? null : <SourcesCard output={out} />;
    }
    if (name === "show_diff") {
      const out = part.output as ShowDiffOutput & { error?: string };
      return out?.error ? (
        <ToolResult name={name} output={part.output} />
      ) : (
        <DiffCard output={out} />
      );
    }
    return <ToolResult name={name} output={part.output} />;
  }

  const isError = part.state === "output-error";
  const isDenied = part.state === "output-denied";
  const running = !isError && !isDenied;
  const label = isError
    ? `${name} failed`
    : isDenied
      ? `${name} skipped`
      : `${RUNNING_LABELS[name] ?? name}…`;

  return (
    <div
      className={cn(
        "animate-in fade-in flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs duration-300",
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
                  ? "danger"
                  : option.style === "primary"
                    ? "primary"
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
