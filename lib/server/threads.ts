import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { ThreadChannel, ThreadRecord, ThreadState, ThreadSummary } from "@/shared/types/thread";
import { truncateThreadTitle } from "@/shared/types/thread";
import { createError } from "@/lib/server/http";

const LIST_LIMIT = 50;

function parseThreadState(value: string | null): ThreadState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as ThreadState;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.events)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function serializeThreadState(state: ThreadState | undefined) {
  return state ? JSON.stringify(state) : null;
}

function mergeThreadState(existing: ThreadState | null, incoming: ThreadState): ThreadState {
  const session = incoming.session;

  return {
    session: {
      sessionId: session.sessionId ?? existing?.session.sessionId,
      continuationToken: session.continuationToken ?? existing?.session.continuationToken,
      streamIndex: session.streamIndex,
    },
    events: incoming.events,
  };
}

function rowToSummary(row: typeof schema.threads.$inferSelect): ThreadSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    channel: (row.channel as ThreadChannel) ?? "web",
    slackChannelId: row.slackChannelId,
    slackThreadTs: row.slackThreadTs,
  };
}

function rowToRecord(row: typeof schema.threads.$inferSelect): ThreadRecord {
  return {
    ...rowToSummary(row),
    state: parseThreadState(row.state),
  };
}

export async function listThreadsForUser(userId: string): Promise<ThreadSummary[]> {
  // Only the summary columns — never pull the (potentially huge) `state` blob
  // just to render a list of titles.
  const rows = await db
    .select({
      id: schema.threads.id,
      title: schema.threads.title,
      createdAt: schema.threads.createdAt,
      updatedAt: schema.threads.updatedAt,
      channel: schema.threads.channel,
      slackChannelId: schema.threads.slackChannelId,
      slackThreadTs: schema.threads.slackThreadTs,
    })
    .from(schema.threads)
    .where(eq(schema.threads.userId, userId))
    .orderBy(desc(schema.threads.updatedAt))
    .limit(LIST_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    channel: (row.channel as ThreadChannel) ?? "web",
    slackChannelId: row.slackChannelId,
    slackThreadTs: row.slackThreadTs,
  }));
}

export async function getThreadForUser(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.threads)
    .where(and(eq(schema.threads.id, id), eq(schema.threads.userId, userId)))
    .limit(1);

  return row ? rowToRecord(row) : undefined;
}

export async function getSlackThreadForUser(
  userId: string,
  slackChannelId: string,
  slackThreadTs: string,
): Promise<ThreadRecord | undefined> {
  const [row] = await db
    .select()
    .from(schema.threads)
    .where(
      and(
        eq(schema.threads.userId, userId),
        eq(schema.threads.slackChannelId, slackChannelId),
        eq(schema.threads.slackThreadTs, slackThreadTs),
      ),
    )
    .limit(1);

  return row ? rowToRecord(row) : undefined;
}

export async function createThreadForUser(
  userId: string,
  input: {
    id?: string;
    title?: string;
    channel?: ThreadChannel;
    slackChannelId?: string;
    slackThreadTs?: string;
  },
) {
  const id = input.id ?? crypto.randomUUID();
  const title = input.title?.trim() || "New chat";

  await db.insert(schema.threads).values({
    id,
    userId,
    title: truncateThreadTitle(title),
    channel: input.channel ?? "web",
    slackChannelId: input.slackChannelId ?? null,
    slackThreadTs: input.slackThreadTs ?? null,
  });

  const created = await getThreadForUser(userId, id);
  if (!created) {
    throw createError({ statusCode: 500, statusMessage: "Failed to create thread" });
  }

  return created;
}

export async function upsertSlackThreadForUser(
  userId: string,
  input: {
    slackChannelId: string;
    slackThreadTs: string;
    title?: string;
    state?: ThreadState;
  },
): Promise<ThreadRecord> {
  const existing = await getSlackThreadForUser(userId, input.slackChannelId, input.slackThreadTs);

  if (existing) {
    // Update title / state if provided
    if (input.title !== undefined || input.state !== undefined) {
      await db
        .update(schema.threads)
        .set({
          ...(input.title !== undefined ? { title: truncateThreadTitle(input.title) } : {}),
          ...(input.state !== undefined
            ? { state: serializeThreadState(mergeThreadState(existing.state, input.state)) }
            : {}),
        })
        .where(eq(schema.threads.id, existing.id));
    }
    return (await getThreadForUser(userId, existing.id))!;
  }

  return createThreadForUser(userId, {
    title: input.title,
    channel: "slack",
    slackChannelId: input.slackChannelId,
    slackThreadTs: input.slackThreadTs,
  });
}

export async function updateThreadForUser(
  userId: string,
  id: string,
  patch: { title?: string; state?: ThreadState },
) {
  const existing = await getThreadForUser(userId, id);
  if (!existing) {
    return undefined;
  }

  await db
    .update(schema.threads)
    .set({
      ...(patch.title !== undefined ? { title: truncateThreadTitle(patch.title) } : {}),
      ...(patch.state !== undefined
        ? { state: serializeThreadState(mergeThreadState(existing.state, patch.state)) }
        : {}),
    })
    .where(and(eq(schema.threads.id, id), eq(schema.threads.userId, userId)));

  return getThreadForUser(userId, id);
}

export async function deleteThreadForUser(userId: string, id: string) {
  const existing = await getThreadForUser(userId, id);
  if (!existing) {
    return false;
  }

  await db
    .delete(schema.threads)
    .where(and(eq(schema.threads.id, id), eq(schema.threads.userId, userId)));

  return true;
}
