import type { UserProfileWithUser } from "../../shared/types/profile.js";
import type { ThreadSummary } from "../../shared/types/thread.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

// Fetch wrappers for the agent's self-knowledge tools. Agent code cannot import
// lib/server/* (the eve runtime resolves it independently of the Next path
// aliases), so everything goes over the internal HTTP API.
//
// The internal API has NO per-user authorization — the shared bearer is fully
// trusted. Every userId passed here must come from ctx.session.auth.current,
// never from tool input.

export interface ProfilePatch {
  name?: string;
  timezone?: string;
  locale?: string;
  bio?: string;
}

export async function updateProfileRemote(userId: string, patch: ProfilePatch) {
  const response = await fetch(`${appOrigin()}/api/internal/profile`, {
    method: "PATCH",
    headers: internalHeaders(),
    body: JSON.stringify({ userId, ...patch }),
  });

  if (!response.ok) {
    return undefined;
  }

  const body = (await response.json()) as { profile: UserProfileWithUser };
  return body.profile;
}

export interface ConnectorStatusSummary {
  id: string;
  name: string;
  state: string;
  connectedAs?: string;
  hint?: string;
}

export interface IntegrationsSummary {
  connectors: ConnectorStatusSummary[];
  channels: {
    slack: { linked: boolean; displayName?: string };
    imessage: { linked: boolean; phoneNumber?: string };
  };
}

export async function fetchIntegrationsRemote(userId: string) {
  const response = await fetch(
    `${appOrigin()}/api/internal/integrations?userId=${encodeURIComponent(userId)}`,
    { headers: internalHeaders() },
  );

  if (!response.ok) {
    return undefined;
  }

  return (await response.json()) as IntegrationsSummary;
}

export async function fetchThreadsRemote(userId: string) {
  const response = await fetch(
    `${appOrigin()}/api/internal/threads?userId=${encodeURIComponent(userId)}`,
    { headers: internalHeaders() },
  );

  if (!response.ok) {
    return undefined;
  }

  const body = (await response.json()) as { threads: ThreadSummary[] };
  return body.threads;
}
