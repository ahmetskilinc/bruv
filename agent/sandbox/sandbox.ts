import { defineSandbox } from "eve/sandbox";
import type { SandboxNetworkPolicy } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";
import { agent } from "../../shared/agent.js";
import {
  isGithubNotConnected,
  userGithubToken,
} from "../lib/github-token.js";

// The agent's dev environment for real code changes: clone a repo into
// /workspace, branch, edit, run tests/build, commit, and push — as the CONNECTED
// USER. Pinned to Vercel Sandbox because only the Vercel (and microsandbox)
// backends support firewall-level credential brokering, which is how we get git
// auth without the user's token ever entering the sandbox.

// Hosts the sandbox is allowed to reach when no GitHub token is brokered in.
// Package registries so `npm`/`pnpm`/`bun`/`pip` installs work for tests/builds.
const BASE_ALLOW: SandboxNetworkPolicy = {
  allow: {
    "github.com": [],
    "codeload.github.com": [],
    "*.githubusercontent.com": [],
    "registry.npmjs.org": [],
    "*.npmjs.org": [],
    "registry.yarnpkg.com": [],
    "pypi.org": [],
    "files.pythonhosted.org": [],
    "*": [],
  },
};

// Same allow-list, but the firewall injects HTTPS git auth for GitHub hosts so
// `git clone`/`push` authenticate as the connected user. The secret stays at the
// firewall and never reaches the sandbox process.
function brokeredPolicy(token: string): SandboxNetworkPolicy {
  // GitHub smart-HTTP accepts Basic auth as `x-access-token:<token>`.
  const basic = `Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
  const transform = [{ transform: [{ headers: { authorization: basic } }] }];
  return {
    allow: {
      "github.com": transform,
      "codeload.github.com": transform,
      "*.githubusercontent.com": transform,
      "registry.npmjs.org": [],
      "*.npmjs.org": [],
      "registry.yarnpkg.com": [],
      "pypi.org": [],
      "files.pythonhosted.org": [],
      "*": [],
    },
  };
}

export default defineSandbox({
  description:
    "Vercel Sandbox dev environment for branch/edit/test/push/PR workflows, with per-user GitHub git auth brokered at the firewall.",
  backend: vercel({ resources: { vcpus: 2 } }),

  // Template-scoped: runs once when the template is built. Set a stable git
  // identity and non-interactive defaults so git never hangs on a credential
  // prompt (the firewall supplies auth on the wire).
  async bootstrap({ use }) {
    const sandbox = await use();
    await sandbox.run({
      command: [
        `git config --global user.name "${agent.name} (agent)"`,
        `git config --global user.email "${agent.slug}@users.noreply.github.com"`,
        "git config --global init.defaultBranch main",
        "git config --global advice.detachedHead false",
        // never block on an interactive credential / host prompt
        "git config --global core.askPass true",
      ].join(" && "),
      env: { GIT_TERMINAL_PROMPT: "0" },
    });
  },

  // Durable-session-scoped: runs once per session. Broker the connected user's
  // GitHub token into the firewall for this session. If GitHub isn't connected,
  // fall back to the no-auth allow-list (public clones still work; pushes will
  // fail, which the agent surfaces as "connect github").
  async onSession({ use, ctx }) {
    const userId = ctx.session.auth.current?.principalId;
    if (!userId || userId.startsWith("eve:")) {
      await use({ networkPolicy: BASE_ALLOW });
      return;
    }

    try {
      const token = await userGithubToken(userId);
      await use({ networkPolicy: brokeredPolicy(token) });
    } catch (error) {
      if (isGithubNotConnected(error)) {
        await use({ networkPolicy: BASE_ALLOW });
        return;
      }
      throw error;
    }
  },
});
