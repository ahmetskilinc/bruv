import { z } from "zod";
import { listThreadsForUser } from "@/lib/server/threads";
import { requireInternalRequest } from "@/lib/server/internal-api";
import { errorResponse, queryParams } from "@/lib/server/http";

const querySchema = z.object({
  userId: z.coerce.string().trim().min(1, "userId is required"),
});

// Titles and timestamps only. listThreadsForUser deliberately never selects the
// `state` blob, and titles are derived from the first user message — so they are
// the summaries. Searching inside transcripts would mean parsing unbounded JSON
// with no index; that is a different project.
export async function GET(request: Request) {
  try {
    requireInternalRequest(request);
    const { userId } = querySchema.parse(queryParams(request));
    const threads = await listThreadsForUser(userId);
    return Response.json({ threads });
  } catch (error) {
    return errorResponse(error);
  }
}
