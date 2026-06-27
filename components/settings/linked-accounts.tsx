"use client";

import { useEffect, useState } from "react";
import { Button, Card, toast } from "bruv-ui";
import { authClient } from "@/lib/auth-client";
import { GithubMark } from "@/components/github-mark";

export function LinkedAccounts() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const { data } = await authClient.listAccounts();
      setLinked(
        (data ?? []).some(
          (a: { providerId: string }) => a.providerId === "github",
        ),
      );
    } catch {
      setLinked(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function link() {
    setBusy(true);
    // Redirects to GitHub; on return Better Auth links it to this account.
    await authClient.linkSocial({
      provider: "github",
      callbackURL: "/settings/profile",
    });
  }

  async function unlink() {
    setBusy(true);
    try {
      const res = await authClient.unlinkAccount({ providerId: "github" });
      if (res.error) throw new Error(res.error.message ?? "Failed to unlink");
      toast.success("github unlinked");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed to unlink");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Card.Content>
        <Card.Header>
          <div className="text-foreground font-semibold">linked accounts</div>
          <p className="text-muted-foreground text-sm">
            link a provider so you can also sign in with it.
          </p>
        </Card.Header>
        <Card.Body>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GithubMark className="size-5" />
            <div>
              <div className="text-sm">GitHub</div>
              {linked && (
                <div className="text-muted-foreground text-xs">linked</div>
              )}
            </div>
          </div>
          {linked === null ? (
            <span className="text-muted-foreground text-xs">…</span>
          ) : linked ? (
            <Button size="sm" variant="outline" onClick={unlink} disabled={busy}>
              unlink
            </Button>
          ) : (
            <Button size="sm" onClick={link} disabled={busy}>
              link github
            </Button>
          )}
        </div>
        </Card.Body>
      </Card.Content>
    </Card>
  );
}
