import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "./db";

const baseURL = process.env.BETTER_AUTH_URL?.trim();

// Origins allowed to make auth requests. baseURL is trusted automatically; this
// covers the apex, www, the vercel.app fallback, and local dev.
const trustedOrigins = [
  "https://bruv.chat",
  "https://www.bruv.chat",
  "https://bruv-sandy.vercel.app",
  "http://localhost:3000",
  "http://192.168.0.42:3000",
];

// GitHub social login. Only enabled once the OAuth app credentials are set, so
// it's a no-op until then (no broken provider).
const githubClientId = process.env.GITHUB_CLIENT_ID?.trim();
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
const socialProviders =
  githubClientId && githubClientSecret
    ? { github: { clientId: githubClientId, clientSecret: githubClientSecret } }
    : undefined;

export const auth = betterAuth({
  ...(baseURL ? { baseURL } : {}),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  ...(socialProviders ? { socialProviders } : {}),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github"],
      // A signed-in user can link GitHub even if its email differs from their
      // account email (they're authenticated and explicitly choosing to link).
      allowDifferentEmails: true,
    },
  },
});
