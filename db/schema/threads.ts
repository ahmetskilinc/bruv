import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const threads = pgTable(
  "threads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    state: text("state"),
    // Which channel this thread originated from: "web" | "slack" | "imessage"
    channel: text("channel").default("web").notNull(),
    // For slack threads: the Slack channel ID (e.g. "D0BBU42N43X")
    slackChannelId: text("slack_channel_id"),
    // For slack threads: the Slack thread_ts that identifies the conversation
    slackThreadTs: text("slack_thread_ts"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("threads_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("threads_slack_thread_idx").on(table.slackChannelId, table.slackThreadTs),
  ],
);

export const threadsRelations = relations(threads, ({ one }) => ({
  user: one(user, { fields: [threads.userId], references: [user.id] }),
}));
