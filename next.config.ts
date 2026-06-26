import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
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
// Vercel deploy in prod, with eve served behind /_eve_internal/eve.
export default withEve(nextConfig);
