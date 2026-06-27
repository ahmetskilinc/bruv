"use client";

import { useState } from "react";
import { toast } from "bruv-ui";
import { useConnectors } from "@/hooks/use-connectors";
import type { PendingAuthorization } from "@/hooks/use-chat-session";
import { Button } from "bruv-ui";

function titleCase(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Rendered when a turn is parked waiting for a connection's OAuth. Sends the
// user through the same Vercel Connect flow as settings → integrations, but
// passes the connection's webhook as `resumeUrl` so the parked turn resumes
// once the grant comes back.
export function AuthorizationPrompt({
  authorization,
}: {
  authorization: PendingAuthorization;
}) {
  const { connectors, connect } = useConnectors();
  const [busy, setBusy] = useState(false);

  const connector = connectors.find(
    (c) => c.connectionName === authorization.name,
  );
  const label = authorization.displayName ?? titleCase(authorization.name);

  async function onConnect() {
    // If we have a direct authorize URL from the challenge, use it as-is.
    if (authorization.url) {
      window.location.href = authorization.url;
      return;
    }

    if (!connector) {
      // No mapped connector — fall back to the integrations hub.
      window.location.href = "/settings/integrations";
      return;
    }

    setBusy(true);
    try {
      const url = await connect({
        id: connector.id,
        resumeUrl: authorization.webhookUrl,
      });
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "couldn't start sign-in");
      setBusy(false);
    }
  }

  return (
    <div className="bg-card flex max-w-md flex-col gap-3 rounded-xl border p-3.5">
      <div className="flex flex-col gap-1">
        <p className="text-sm">connect {label} to keep going</p>
        <p className="text-muted-foreground text-xs">
          i need access to your {label} to finish this. it picks up right where
          it left off once you&apos;re connected.
        </p>
      </div>
      {authorization.userCode && (
        <p className="text-sm">
          code: <span className="font-mono">{authorization.userCode}</span>
        </p>
      )}
      <div>
        <Button variant="primary" size="sm" onClick={onConnect} disabled={busy}>
          {busy ? "opening…" : `connect ${label}`}
        </Button>
      </div>
    </div>
  );
}
