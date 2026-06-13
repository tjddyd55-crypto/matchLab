import "server-only";

import { eventRepository } from "@/lib/repositories/event.repository";
import {
  isSpectatorContentAccessible,
  resolveSpectatorAccessState,
  type SpectatorAccessFields,
  type SpectatorAccessState,
} from "@/lib/spectator-access";
import type { PublicEventTabId } from "@/lib/public-event-tabs";

export type PublicSpectatorGuardResult = {
  policy: SpectatorAccessFields;
  state: SpectatorAccessState;
  accessible: boolean;
};

export function isRestrictedPublicSpectatorTab(tab: PublicEventTabId): boolean {
  return tab === "brackets" || tab === "results" || tab === "live";
}

export async function loadPublicSpectatorGuardBySlug(
  slug: string,
): Promise<PublicSpectatorGuardResult | null> {
  const policy = await eventRepository.findPublicSpectatorPolicyBySlug(slug);
  if (!policy) return null;
  const state = resolveSpectatorAccessState(policy);
  return {
    policy,
    state,
    accessible: isSpectatorContentAccessible(policy),
  };
}
