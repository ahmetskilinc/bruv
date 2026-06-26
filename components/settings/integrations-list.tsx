"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useConnectors } from "@/hooks/use-connectors";
import { useSlackLink } from "@/hooks/use-slack-link";
import type { ConnectorSummary } from "@/shared/types/connector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function msg(error: unknown) {
  return error instanceof Error ? error.message : "something went wrong";
}

export function IntegrationsList() {
  const { connectors, isLoading, connect, test, revoke } = useConnectors();

  return (
    <div className="flex flex-col gap-6 pb-10">
      {isLoading && <p className="text-muted-foreground text-sm">loading…</p>}
      {connectors.map((connector) => (
        <ConnectorCard
          key={connector.id}
          connector={connector}
          connect={connect}
          test={test}
          revoke={revoke}
        />
      ))}
      <SlackLinkCard />
    </div>
  );
}

function ConnectorCard({
  connector,
  connect,
  test,
  revoke,
}: {
  connector: ConnectorSummary;
  connect: (input: { id: string; resumeUrl?: string }) => Promise<string>;
  test: (id: string) => Promise<string[]>;
  revoke: (id: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<string[] | null>(null);
  const status = connector.status;
  const connected = status.state === "connected";

  async function onConnect() {
    setBusy("connect");
    try {
      const url = await connect({ id: connector.id });
      window.location.href = url;
    } catch (error) {
      toast.error(msg(error));
      setBusy(null);
    }
  }

  async function onTest() {
    setBusy("test");
    try {
      setResults(await test(connector.id));
    } catch (error) {
      toast.error(msg(error));
    } finally {
      setBusy(null);
    }
  }

  async function onRevoke() {
    setBusy("revoke");
    try {
      await revoke(connector.id);
      setResults(null);
      toast.success("disconnected");
    } catch (error) {
      toast.error(msg(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{connector.name}</CardTitle>
          <Badge variant={connected ? "default" : status.state === "error" ? "destructive" : "secondary"}>
            {connected ? (connector.connectedAs ?? "connected") : status.state.replace(/_/g, " ")}
          </Badge>
        </div>
        <CardDescription>{connector.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status.state === "setup_required" && (
          <Alert>
            <AlertTitle>setup needed</AlertTitle>
            <AlertDescription>
              <span className="whitespace-pre-wrap">
                {status.message}
                {status.hint ? `\n\n${status.hint}` : ""}
              </span>
            </AlertDescription>
          </Alert>
        )}
        {status.state === "error" && (
          <Alert variant="destructive">
            <AlertTitle>error</AlertTitle>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <Button size="sm" onClick={onTest} disabled={busy !== null}>
                {busy === "test" ? "testing…" : connector.testLabel}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onRevoke}
                disabled={busy !== null}
              >
                disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onConnect} disabled={busy !== null}>
              {busy === "connect" ? "connecting…" : "connect"}
            </Button>
          )}
        </div>

        {results && (
          <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-sm">
            {results.map((result, index) => (
              <li key={index}>{result}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SlackLinkCard() {
  const { link, isLoading, generateCode, unlink } = useSlackLink();
  const [busy, setBusy] = useState(false);

  async function onGenerate() {
    setBusy(true);
    try {
      await generateCode();
    } catch (error) {
      toast.error(msg(error));
    } finally {
      setBusy(false);
    }
  }

  async function onUnlink() {
    setBusy(true);
    try {
      await unlink();
      toast.success("unlinked");
    } catch (error) {
      toast.error(msg(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Slack</CardTitle>
          <Badge variant={link?.linked ? "default" : "secondary"}>
            {link?.linked ? "linked" : "not linked"}
          </Badge>
        </div>
        <CardDescription>
          link your Slack account so mentions and DMs use this profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading && <p className="text-muted-foreground text-sm">loading…</p>}

        {link?.linked ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">
              linked as {link.displayName ?? link.userName ?? link.userId}
            </span>
            <Button size="sm" variant="outline" onClick={onUnlink} disabled={busy}>
              unlink
            </Button>
          </div>
        ) : link?.pendingCode ? (
          <Alert>
            <AlertTitle>
              your code: <span className="font-mono">{link.pendingCode}</span>
            </AlertTitle>
            <AlertDescription>
              DM bruv on Slack: <span className="font-mono">link {link.pendingCode}</span>
            </AlertDescription>
          </Alert>
        ) : (
          <div>
            <Button size="sm" onClick={onGenerate} disabled={busy}>
              {busy ? "generating…" : "generate link code"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
