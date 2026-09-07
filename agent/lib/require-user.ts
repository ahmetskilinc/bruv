// Identifying the app user behind a session, in one place.
//
// `ctx.session.auth.current.principalId` IS the app `user.id` on every channel
// (web via agent/channels/eve.ts, Slack and iMessage via buildAppSessionAuth).
// But it is also populated for eve's own runtime principals — the REPL, the
// TUI, schedule dispatches — whose ids are prefixed "eve:" and match no row in
// the user table. Tools that write user-scoped data must reject those.

export interface AuthedContext {
  session: { auth: { current?: { principalId?: string } | null } };
}

/**
 * The signed-in app user, or undefined for anonymous callers and eve's own
 * runtime principals. Never trust a user id that came from tool input — the
 * internal API has no per-user authorization, so the id must come from here.
 */
export function currentUserId(ctx: AuthedContext): string | undefined {
  const principalId = ctx.session.auth.current?.principalId;
  if (!principalId || principalId.startsWith("eve:")) {
    return undefined;
  }
  return principalId;
}

export const NOT_SIGNED_IN = {
  error:
    "I can't do that without a signed-in account. Tell them to sign in at bruv.chat, or link this channel in Settings.",
} as const;
