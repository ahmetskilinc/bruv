export type ThreadChannel = "web" | "slack" | "imessage";

export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  channel: ThreadChannel;
  slackChannelId?: string | null;
  slackThreadTs?: string | null;
}

// Mirrors eve's `ClientSessionState` (eve/client). Kept as a structural type so
// server code can persist it without importing the eve client bundle.
export interface EveSessionCursor {
  sessionId: string;
  streamIndex: number;
}

export interface ThreadState {
  session: EveSessionCursor;
  events: unknown[];
}

export interface ThreadRecord extends ThreadSummary {
  state: ThreadState | null;
}

export function truncateThreadTitle(text: string, maxLength = 60): string {
  const line = text.trim().split("\n")[0]?.trim() || "New chat";
  if (line.length <= maxLength) {
    return line;
  }

  return `${line.slice(0, maxLength - 1)}…`;
}
