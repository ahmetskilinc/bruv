"use client";

import { useEffect, useRef } from "react";
import { useChatSession } from "@/hooks/use-chat-session";
import type { ThreadState } from "@/shared/types/thread";
import { ChatMessage } from "./message";
import { AuthorizationPrompt } from "./authorization-prompt";
import { Composer } from "./composer";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Spinner } from "@/components/ui/spinner";

export function Chat({
  threadId,
  initialState,
}: {
  threadId: string;
  initialState: ThreadState | null;
}) {
  const chat = useChatSession(threadId, initialState);
  const startedRef = useRef(false);

  // Consume a first message handed off from the home composer.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const key = `pending:${threadId}`;
    const pending = sessionStorage.getItem(key);
    if (pending) {
      sessionStorage.removeItem(key);
      void chat.sendMessage(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MessageScrollerProvider>
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
              {chat.messages.map((message) => (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={message.role === "user"}
                >
                  <ChatMessage
                    message={message}
                    onRespond={chat.respond}
                    canRespond={!chat.isBusy}
                  />
                </MessageScrollerItem>
              ))}
              {chat.authorization && (
                <MessageScrollerItem scrollAnchor={false}>
                  <AuthorizationPrompt authorization={chat.authorization} />
                </MessageScrollerItem>
              )}
              {chat.status === "submitted" && (
                <MessageScrollerItem scrollAnchor={false}>
                  <Marker role="status">
                    <MarkerIcon>
                      <Spinner />
                    </MarkerIcon>
                    <MarkerContent>Thinking…</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
              )}
              {chat.error && (
                <MessageScrollerItem scrollAnchor={false}>
                  <p className="text-destructive text-sm">
                    {chat.error.message}
                  </p>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <Composer
          onSend={chat.sendMessage}
          onStop={chat.stop}
          isBusy={chat.isBusy}
        />
      </div>
    </div>
  );
}
