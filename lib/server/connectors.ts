import type { ConnectorDef } from "@/shared/types/connector";
import { createError } from "@/lib/server/http";

export const connectors: ConnectorDef[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Your repositories, issues, and pull requests.",
    connector: "github/bruv",
    connectionName: "github",
    icon: "i-simple-icons-github",
    scopes: ["repo"],
    test: {
      label: "List my repos",
      run: async (token) => {
        const res = await fetch(
          "https://api.github.com/user/repos?per_page=5&sort=pushed",
          { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" } },
        );
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        const repos = (await res.json()) as Array<{ full_name: string }>;
        return repos.map((r) => r.full_name);
      },
    },
  },
];

export function getConnector(id: string): ConnectorDef {
  const connector = connectors.find((entry) => entry.id === id);

  if (!connector) {
    throw createError({ statusCode: 404, statusMessage: "Connector not found" });
  }

  return connector;
}
