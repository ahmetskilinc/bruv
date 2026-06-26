"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clipboard, NotePencil, Trash } from "@phosphor-icons/react";
import { useMemory } from "@/hooks/use-memory";
import { MEMORY_CATEGORIES, MEMORY_CATEGORY_LABELS } from "@/shared/types/memory";
import { MEMORY_EXPORT_PROMPT } from "@/shared/memory/export-prompt";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export function MemorySection() {
  const { memory, isLoading, importMemory, updateEntry, deleteEntry } = useMemory();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>memory</CardTitle>
        <CardDescription>long-term context bruv keeps about you.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex justify-end">
          <ImportDialog onImport={importMemory} />
        </div>

        {MEMORY_CATEGORIES.map((cat) => {
          const entry = memory?.[cat]?.[0];
          const isEditing = entry ? editing === entry.id : false;

          return (
            <div key={cat} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {MEMORY_CATEGORY_LABELS[cat]}
                </span>
                {entry && !isEditing && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(entry.id);
                        setDraft(entry.content);
                      }}
                    >
                      <NotePencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Delete"
                      onClick={async () => {
                        await deleteEntry(entry.id);
                        toast.success("removed");
                      }}
                    >
                      <Trash />
                    </Button>
                  </div>
                )}
              </div>

              {entry && isEditing ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    rows={4}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await updateEntry({ id: entry.id, content: draft });
                        setEditing(null);
                        toast.success("saved");
                      }}
                    >
                      save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {entry?.content ?? (isLoading ? "…" : "—")}
                </p>
              )}
              <Separator />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ImportDialog({
  onImport,
}: {
  onImport: (raw: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(MEMORY_EXPORT_PROMPT);
    toast.success("prompt copied — paste it into any LLM, then bring the result back");
  }

  async function add() {
    setBusy(true);
    try {
      await onImport(raw);
      toast.success("memory imported");
      setOpen(false);
      setRaw("");
    } catch {
      toast.error("import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        import
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>import memory</DialogTitle>
            <DialogDescription>
              copy the prompt, run it in another LLM, paste the result here.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button variant="outline" size="sm" onClick={copyPrompt}>
              <Clipboard data-icon="inline-start" />
              copy export prompt
            </Button>
            <Textarea
              rows={8}
              placeholder="paste your exported memory…"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={add} disabled={busy || !raw.trim()}>
              {busy ? "importing…" : "add to memory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
