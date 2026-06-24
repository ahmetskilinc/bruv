import { z } from "zod";
import { requireInternalRequest } from "@/lib/server/internal-api";
import { errorResponse } from "@/lib/server/http";
import { getSlackLinkForMember } from "@/lib/server/slack-links";
import { upsertSlackThreadForUser } from "@/lib/server/threads";

const upsertSlackThreadBodySchema = z.object({
  slackTeamId: z.string().min(1),
  slackUserId: z.string().min(1),
  slackChannelId: z.string().min(1),
  slackThreadTs: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  try {
    requireInternalRequest(request);
    const body = upsertSlackThreadBodySchema.parse(await request.json());

    const link = await getSlackLinkForMember(body.slackTeamId, body.slackUserId);
    if (!link) {
      // User hasn't linked their Slack account — nothing to sync yet
      return Response.json({ thread: null });
    }

    const thread = await upsertSlackThreadForUser(link.appUserId, {
      slackChannelId: body.slackChannelId,
      slackThreadTs: body.slackThreadTs,
      title: body.title,
    });

    return Response.json({ thread });
  } catch (error) {
    return errorResponse(error);
  }
}
