import { z } from "zod";
import { connectors } from "@/lib/server/connectors";
import { probeStatus } from "@/lib/server/connect";
import { getSlackLinkForAppUser } from "@/lib/server/slack-links";
import { getPhoneLinkForAppUser } from "@/lib/server/phone-links";
import { requireInternalRequest } from "@/lib/server/internal-api";
import { errorResponse, queryParams } from "@/lib/server/http";

const querySchema = z.object({
  userId: z.coerce.string().trim().min(1, "userId is required"),
});

/** Last 4 digits only — the model never needs the whole number. */
function maskPhone(phoneNumber: string) {
  return phoneNumber.length <= 4 ? phoneNumber : `…${phoneNumber.slice(-4)}`;
}

// The agent-facing mirror of app/api/connectors/route.ts, plus channel link
// state. Without it the only way the agent learns GitHub isn't connected is by
// burning a turn on a failed call.
export async function GET(request: Request) {
  try {
    requireInternalRequest(request);
    const { userId } = querySchema.parse(queryParams(request));

    const [connectorStatuses, slackLink, phoneLink] = await Promise.all([
      Promise.all(
        connectors.map(async (connector) => {
          const status = await probeStatus(connector, userId);
          return {
            id: connector.id,
            name: connector.name,
            state: status.state,
            connectedAs: status.state === "connected" ? status.label : undefined,
            hint: "hint" in status ? status.hint : undefined,
          };
        }),
      ),
      getSlackLinkForAppUser(userId),
      getPhoneLinkForAppUser(userId),
    ]);

    return Response.json({
      connectors: connectorStatuses,
      channels: {
        slack: slackLink
          ? { linked: true, displayName: slackLink.slackDisplayName ?? slackLink.slackUserName }
          : { linked: false },
        imessage: phoneLink
          ? { linked: true, phoneNumber: maskPhone(phoneLink.phoneNumber) }
          : { linked: false },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
