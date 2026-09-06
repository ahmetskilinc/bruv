import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.42"],
  turbopack: {
    resolveAlias: {
      // See lib/eve-client.ts: import eve's browser-safe `Client` directly from
      // its built file, bypassing the `eve/client` barrel that pulls node:module.
      "eve-client-impl": "./node_modules/eve/dist/src/client/client.js",
    },
  },
};

// withEve mounts the eve agent (agent/) alongside the Next.js app as one
// project: same origin in dev (next dev boots the eve dev server) and a single
// Vercel deploy in prod. It generates the Vercel services graph and /eve/v1
// routes at build time — vercel.json must not author its own services block,
// or workflow callback URLs mint to a dead private prefix and channel/stream
// delivery silently fails (turns run, replies never arrive).
export default withEve(nextConfig);
