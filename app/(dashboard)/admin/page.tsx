import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/server/admin";
import { getAdminStats } from "@/lib/server/stats";
import { Card } from "bruv-ui";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  // Hard lock: anyone who isn't the admin gets a 404 (no hint it exists).
  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  const stats = await getAdminStats();

  const cards = [
    { label: "accounts", value: stats.users.total, sub: `+${stats.users.last7d} this week` },
    { label: "conversations", value: stats.threads.total, sub: `+${stats.threads.last7d} this week` },
    { label: "messages sent", value: stats.messages.sent, sub: "by users" },
    { label: "messages received", value: stats.messages.received, sub: "from bruv" },
    { label: "memory entries", value: stats.memoryEntries, sub: undefined },
    { label: "imessage linked", value: stats.imessageLinked, sub: undefined },
    { label: "slack linked", value: stats.slackLinked, sub: undefined },
  ];

  return (
    <div className="mx-auto h-full w-full max-w-4xl overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight lowercase">admin</h1>
        <p className="text-muted-foreground text-sm">
          bruv at a glance · as of {new Date(stats.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <Card.Content>
              <Card.Header className="pb-1">
                <p className="text-muted-foreground text-sm lowercase">{card.label}</p>
              </Card.Header>
              <Card.Body>
                <div className="text-3xl font-semibold tabular-nums">
                  {card.value.toLocaleString()}
                </div>
                {card.sub && (
                  <p className="text-muted-foreground mt-1 text-xs">{card.sub}</p>
                )}
              </Card.Body>
            </Card.Content>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <Card.Content>
          <Card.Header>
            <div className="text-foreground font-semibold text-base lowercase">token usage</div>
            <p className="text-muted-foreground text-sm">
              via the Vercel AI Gateway reporting API (last 30 days)
            </p>
          </Card.Header>
          <Card.Body>
            {!stats.tokens.configured ? (
            <p className="text-muted-foreground text-sm">
              Not configured. Create an AI Gateway API key in the Vercel dashboard
              and set{" "}
              <code className="bg-muted rounded px-1 font-mono">AI_GATEWAY_API_KEY</code>{" "}
              to enable token + cost reporting here.
            </p>
          ) : "error" in stats.tokens ? (
            <p className="text-destructive text-sm">{stats.tokens.error}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex gap-8">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {stats.tokens.totalTokens.toLocaleString()}
                  </div>
                  <p className="text-muted-foreground text-xs">total tokens</p>
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    ${stats.tokens.cost.toFixed(2)}
                  </div>
                  <p className="text-muted-foreground text-xs">cost</p>
                </div>
              </div>
              {stats.tokens.byModel.length > 0 && (
                <div className="text-sm">
                  {stats.tokens.byModel.map((m) => (
                    <div
                      key={m.model}
                      className="flex justify-between border-b py-1.5 last:border-0"
                    >
                      <span className="font-mono text-xs">{m.model}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {m.tokens.toLocaleString()} · ${m.cost.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </Card.Body>
        </Card.Content>
      </Card>

      <Card className="mt-6">
        <Card.Content>
          <Card.Header>
            <div className="text-foreground font-semibold text-base lowercase">all users</div>
          </Card.Header>
          <Card.Body>
          {stats.allUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">none yet</p>
          ) : (
            <div className="flex flex-col">
              {stats.allUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <div className="truncate">{u.name}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {u.email}
                    </div>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          </Card.Body>
        </Card.Content>
      </Card>
    </div>
  );
}
