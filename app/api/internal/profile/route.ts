import { internalPatchProfileBodySchema } from "@/lib/schemas/profile";
import { updateProfileForUser } from "@/lib/server/profile";
import { requireInternalRequest } from "@/lib/server/internal-api";
import { errorResponse } from "@/lib/server/http";

// Lets the agent fix its own context — most importantly the timezone that
// drives the clock in agent/lib/current-time.ts and every date-shaped tool.
export async function PATCH(request: Request) {
  try {
    requireInternalRequest(request);
    const { userId, ...patch } = internalPatchProfileBodySchema.parse(await request.json());
    const profile = await updateProfileForUser(userId, patch);
    return Response.json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}
