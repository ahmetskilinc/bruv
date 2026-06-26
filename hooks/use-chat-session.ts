"use client";

import { useEffect, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import { Client } from "@/lib/eve-client";
import type { InputResponse } from "eve/client";
import type { HandleMessageStreamEvent } from "eve/client";
import { apiFetch } from "@/lib/api";
import { truncateThreadTitle, type ThreadState } from "@/shared/types/thread";

// A connection authorization the model needs before it can continue. eve emits
// `authorization.required` and parks the turn; the default message reducer does
// NOT project this onto message parts, so we read it off the raw event stream
// and render a prompt ourselves.
export interface PendingAuthorization {
  /** eve connection name, e.g. "github" (matches agent/connections/<name>.ts). */
  name: string;
  description: string;
  /** Human-readable provider name, when the challenge supplies one. */
  displayName?: string;
  /** Direct authorize URL from the challenge (often absent for Vercel Connect). */
  url?: string;
  /** Device-flow user code, when present. */
  userCode?: string;
  /** eve connection callback URL — pass as `resumeUrl` so the parked turn
   *  resumes server-side once OAuth completes. */
  webhookUrl?: string;
}

// Scans the authoritative event log for an authorization that was requested but
// not yet completed, returning the most recent one still pending (or null).
function pendingAuthorization(
  events: readonly HandleMessageStreamEvent[],
): PendingAuthorization | null {
  const pending = new Map<string, PendingAuthorization>();

  for (const event of events) {
    if (event.type === "authorization.required") {
      const data = event.data;
      pending.set(data.name, {
        name: data.name,
        description: data.description,
        displayName: data.authorization?.displayName,
        url: data.authorization?.url,
        userCode: data.authorization?.userCode,
        webhookUrl: data.webhookUrl,
      });
    } else if (event.type === "authorization.completed") {
      pending.delete(event.data.name);
    }
  }

  let latest: PendingAuthorization | null = null;
  for (const value of pending.values()) latest = value;
  return latest;
}

// Wraps useEveAgent for one thread: resumes from persisted state, persists
// session + events back to the thread whenever a turn settles — on completion,
// on error, and when it parks waiting for authorization — and names the thread
// from the first message.
export function useChatSession(threadId: string, initialState: ThreadState | null) {
  const titleSet = useRef(Boolean(initialState && initialState.events.length > 0));

  function persist(state: ThreadState) {
    void apiFetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      body: JSON.stringify({ state }),
    }).catch(() => undefined);
  }

  // Latest snapshot, kept fresh each render so observe-only callbacks (onError)
  // and effects can persist the current state without a stale closure.
  const snapshotRef = useRef<ThreadState>({
    session: initialState?.session ?? { streamIndex: 0 },
    events: initialState?.events ?? [],
  });

  // Own the client session so we can set `preserveCompletedSessions`. Without
  // it, eve resets the client-side session after every `session.completed`
  // boundary, so the next turn starts a FRESH server conversation — which
  // reuses the same `turn_0` ids and makes the new turn overwrite the previous
  // messages in the projection. A multi-turn chat must keep the session.
  const [session] = useState(() =>
    new Client({ host: "", preserveCompletedSessions: true }).session(
      initialState?.session,
    ),
  );

  const agent = useEveAgent({
    session,
    initialEvents: initialState?.events as
      | readonly HandleMessageStreamEvent[]
      | undefined,
    onFinish(snapshot) {
      persist({ session: snapshot.session, events: [...snapshot.events] });
    },
    onError() {
      persist(snapshotRef.current);
    },
  });

  snapshotRef.current = { session: agent.session, events: [...agent.events] };

  const authorization = pendingAuthorization(agent.events);

  // A turn that parks for authorization never reaches onFinish, so persist here
  // too — otherwise an interrupted turn is lost on reload.
  useEffect(() => {
    if (authorization) {
      persist(snapshotRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorization?.name]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!titleSet.current) {
      titleSet.current = true;
      void apiFetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: truncateThreadTitle(trimmed) }),
      }).catch(() => undefined);
    }

    await agent.send({ message: trimmed });
  }

  async function respond(responses: InputResponse[]) {
    await agent.send({ inputResponses: responses });
  }

  return {
    messages: agent.data.messages,
    status: agent.status,
    error: agent.error,
    isBusy: agent.status === "submitted" || agent.status === "streaming",
    authorization,
    sendMessage,
    respond,
    stop: agent.stop,
  };
}
