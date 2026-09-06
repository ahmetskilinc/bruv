"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { GithubMark } from "@/components/github-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LinkedAccounts() {
  // Better Auth's unlinkAccount takes the account row id, so keep the id around
  // rather than just a linked/not-linked flag.
  const [githubAccountId, setGithubAccountId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const { data } = await authClient.listAccounts();
      const github = (data ?? []).find(
        (a: { providerId: string }) => a.providerId === "github",
      );
      setGithubAccountId(github?.id ?? null);
    } catch {
      setGithubAccountId(null);
    } finally {
      setLoaded(true);
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
    if (!githubAccountId) return;
    setBusy(true);
    try {
      const res = await authClient.unlinkAccount({
        accountId: githubAccountId,
      });
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
      <CardHeader>
        <CardTitle>linked accounts</CardTitle>
        <CardDescription>
          link a provider so you can also sign in with it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GithubMark className="size-5" />
            <div>
              <div className="text-sm">GitHub</div>
              {githubAccountId && (
                <div className="text-muted-foreground text-xs">linked</div>
              )}
            </div>
          </div>
          {!loaded ? (
            <span className="text-muted-foreground text-xs">…</span>
          ) : githubAccountId ? (
            <Button size="sm" variant="outline" onClick={unlink} disabled={busy}>
              unlink
            </Button>
          ) : (
            <Button size="sm" onClick={link} disabled={busy}>
              link github
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
