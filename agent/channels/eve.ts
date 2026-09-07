import type { AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";
import { auth } from "../../auth.js";

// Authenticates the web chat against the app's Better Auth session, so the
// agent's principalId is the app user id (drives memory injection).
function appSession(): AuthFn<Request> {
  return async (request) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return null;
    }

    return {
      attributes: {
        // Read back by agent/lib/approval.ts — ApprovalContext carries the
        // session auth but not the channel, so each channel stamps its own.
        channel: "web",
        email: session.user.email,
        name: session.user.name,
      },
      authenticator: "app",
      issuer: "app",
      principalId: session.user.id,
      principalType: "user",
    };
  };
}

export default eveChannel({
  auth: [
    // Real app users, identified by their Better Auth session.
    appSession(),
    // Localhost convenience for `bun dev` / the eve REPL.
    localDev(),
    // Vercel OIDC callers (the eve TUI, deployments).
    vercelOidc(),
  ],
});
