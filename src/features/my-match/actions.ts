"use server";

import { buildMyMatchPublicUrl } from "@/lib/my-match/url";

export async function getFighterMyMatchPublicUrlAction(input: {
  eventSlug: string;
  fighterId: string;
}): Promise<string> {
  return buildMyMatchPublicUrl(input.eventSlug.trim(), input.fighterId.trim());
}
