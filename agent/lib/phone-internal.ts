import type { PhoneLinkRecord } from "../../shared/types/phone-link.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

export async function fetchPhoneLinkForNumber(phoneNumber: string) {
  const response = await fetch(
    `${appOrigin()}/api/internal/phone/link?phoneNumber=${encodeURIComponent(phoneNumber)}`,
    { headers: internalHeaders() },
  );

  if (!response.ok) {
    return undefined;
  }

  const body = (await response.json()) as { link: PhoneLinkRecord | null };
  return body.link ?? undefined;
}

/**
 * The reverse lookup: app user -> their linked number. Needed by every
 * proactive path (text_me, digests), which knows who to reach but not where.
 */
export async function fetchPhoneLinkForUser(appUserId: string) {
  const response = await fetch(
    `${appOrigin()}/api/internal/phone/link/user?appUserId=${encodeURIComponent(appUserId)}`,
    { headers: internalHeaders() },
  );

  if (!response.ok) {
    return undefined;
  }

  const body = (await response.json()) as { link: PhoneLinkRecord | null };
  return body.link ?? undefined;
}
