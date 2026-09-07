import type { ApprovalContext } from "eve/tools/approval";

// Channel-aware approval, enforced in code rather than asked for in the prompt.
//
// `ApprovalContext` extends SessionContext, which carries the session auth but
// NOT the channel — so channels stamp their own kind onto the auth attributes
// and we read it back here. agent/channels/sendblue.ts already did this; slack
// and eve (web) were updated to match.

export type ChannelKind = "web" | "slack" | "sendblue" | "unknown";

const KNOWN_CHANNELS: readonly ChannelKind[] = ["web", "slack", "sendblue"];

export function callerChannel(ctx: ApprovalContext<unknown>): ChannelKind {
  const value = ctx.session.auth.current?.attributes?.channel;
  return typeof value === "string" && (KNOWN_CHANNELS as readonly string[]).includes(value)
    ? (value as ChannelKind)
    : "unknown";
}

/**
 * The signed-in app user behind an approval, or undefined. Mirrors
 * currentUserId() in require-user.ts, which takes a tool ctx rather than an
 * approval ctx.
 */
export function approvalUserId(ctx: ApprovalContext<unknown>): string | undefined {
  const principalId = ctx.session.auth.current?.principalId;
  if (!principalId || principalId.startsWith("eve:")) {
    return undefined;
  }
  return principalId;
}

/** True when this turn was started by a schedule rather than by a person. */
export function isScheduledTurn(ctx: ApprovalContext<unknown>): boolean {
  return ctx.session.auth.current?.attributes?.initiated_by === "schedule";
}
