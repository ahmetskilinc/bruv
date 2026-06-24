ALTER TABLE "threads" ADD COLUMN "channel" text DEFAULT 'web' NOT NULL;
--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "slack_channel_id" text;
--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "slack_thread_ts" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "threads_slack_thread_idx" ON "threads" USING btree ("slack_channel_id","slack_thread_ts");
