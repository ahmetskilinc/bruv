"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Stop } from "@phosphor-icons/react";
import { Button } from "bruv-ui";

export function Composer({
  onSend,
  onStop,
  isBusy,
  autoFocus,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  isBusy: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text || isBusy) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(resize);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="bg-card focus-within:border-foreground/25 flex items-end gap-1.5 rounded-2xl border p-1.5 shadow-sm transition-colors">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        placeholder="message bruv…"
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={onKeyDown}
        className="placeholder:text-muted-foreground/70 max-h-50 min-h-9 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none"
      />
      {isBusy ? (
        <Button
          variant="secondary"
          iconLeft={<Stop />}
          className="size-8 shrink-0 rounded-xl"
          onClick={onStop}
          aria-label="Stop"
        />
      ) : (
        <Button
          variant="primary"
          iconLeft={<ArrowUp />}
          className="size-8 shrink-0 rounded-xl disabled:opacity-40"
          onClick={submit}
          disabled={!value.trim()}
          aria-label="Send"
        />
      )}
    </div>
  );
}
