import { phoneLinkByUserQuerySchema } from "@/lib/schemas/phone";
import { getPhoneLinkForAppUser } from "@/lib/server/phone-links";
import { requireInternalRequest } from "@/lib/server/internal-api";
import { errorResponse, queryParams } from "@/lib/server/http";

// Sibling of ../route.ts, which looks a link up by phone number. This is the
// reverse direction, for proactive sends that know the user but not the number.
export async function GET(request: Request) {
  try {
    requireInternalRequest(request);
    const { appUserId } = phoneLinkByUserQuerySchema.parse(queryParams(request));
    const link = await getPhoneLinkForAppUser(appUserId);
    return Response.json({ link: link ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
