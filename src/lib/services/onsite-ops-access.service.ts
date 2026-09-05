import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  buildOnsiteOpsPortalUrl,
  generateOnsiteOpsToken,
  hashOnsiteOpsToken,
  onsiteOpsTokensEqual,
} from "@/lib/onsite-ops/token";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { onsiteOpsAccessRepository } from "@/lib/repositories/onsite-ops-access.repository";
import type { FieldOperationsCaller } from "@/lib/field-operations-auth";

const TOKEN_UNIQUE_RETRIES = 5;

export type ResolvedOnsiteOpsAccess = {
  linkId: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  eventDate: Date;
  eventLocation: string | null;
};

export type OnsiteOpsLinkOwnerVM = {
  linkId: string;
  isActive: boolean;
  hasDisplayableLink: boolean;
  path: string | null;
  url: string | null;
  lastRotatedAt: string | null;
  revokedAt: string | null;
  warning: string;
};

async function allocateUniqueToken(): Promise<{
  rawToken: string;
  tokenHash: string;
}> {
  for (let attempt = 0; attempt < TOKEN_UNIQUE_RETRIES; attempt += 1) {
    const rawToken = generateOnsiteOpsToken();
    const tokenHash = hashOnsiteOpsToken(rawToken);
    const clash = await onsiteOpsAccessRepository.findByTokenHash(tokenHash);
    if (!clash) {
      return { rawToken, tokenHash };
    }
  }
  throw new AppError(
    "INTERNAL",
    "운영관리 링크 발급에 실패했습니다. 다시 시도해 주세요.",
  );
}

function mapOwnerLink(link: {
  id: string;
  isActive: boolean;
  publicToken: string | null;
  lastRotatedAt: Date | null;
  revokedAt: Date | null;
}): OnsiteOpsLinkOwnerVM {
  const path = link.publicToken
    ? buildOnsiteOpsPortalUrl(link.publicToken).replace(/^https?:\/\/[^/]+/, "")
    : null;
  const url = link.publicToken
    ? buildOnsiteOpsPortalUrl(link.publicToken, getAppBaseUrl())
    : null;
  return {
    linkId: link.id,
    isActive: link.isActive,
    hasDisplayableLink: Boolean(link.publicToken && link.isActive),
    path,
    url,
    lastRotatedAt: link.lastRotatedAt?.toISOString() ?? null,
    revokedAt: link.revokedAt?.toISOString() ?? null,
    warning:
      "이 링크를 가진 사용자는 해당 대회의 계체 및 경기운영 정보를 수정할 수 있습니다.",
  };
}

export const onsiteOpsAccessService = {
  async resolveActiveToken(rawToken: string): Promise<ResolvedOnsiteOpsAccess | null> {
    const trimmed = rawToken.trim();
    if (!trimmed) return null;
    const tokenHash = hashOnsiteOpsToken(trimmed);
    const link = await onsiteOpsAccessRepository.findByTokenHash(tokenHash);
    if (!link || !link.isActive || link.revokedAt) return null;
    if (!onsiteOpsTokensEqual(trimmed, link.tokenHash)) return null;
    return {
      linkId: link.id,
      eventId: link.eventId,
      eventTitle: link.event.title,
      eventStatus: link.event.status,
      eventDate: link.event.eventDate,
      eventLocation: link.event.locationName ?? link.event.location,
    };
  },

  async assertActiveToken(rawToken: string): Promise<ResolvedOnsiteOpsAccess> {
    const resolved = await this.resolveActiveToken(rawToken);
    if (!resolved) {
      throw new PermissionError(
        "FORBIDDEN",
        "유효하지 않거나 만료된 운영관리 링크입니다.",
      );
    }
    return resolved;
  },

  toFieldOpsCaller(resolved: ResolvedOnsiteOpsAccess): FieldOperationsCaller {
    return {
      kind: "onsite-ops",
      eventId: resolved.eventId,
      linkId: resolved.linkId,
    };
  },

  async getOwnerLink(actor: ActorContext, eventId: string): Promise<OnsiteOpsLinkOwnerVM | null> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const link = await onsiteOpsAccessRepository.findByEventId(eventId);
    if (!link) return null;
    return mapOwnerLink(link);
  },

  async ensureLink(
    actor: ActorContext,
    eventId: string,
  ): Promise<{ link: OnsiteOpsLinkOwnerVM; rawToken: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const existing = await onsiteOpsAccessRepository.findByEventId(eventId);
    if (existing?.isActive && existing.publicToken && !existing.revokedAt) {
      return {
        link: mapOwnerLink(existing),
        rawToken: existing.publicToken,
      };
    }

    const { rawToken, tokenHash } = await allocateUniqueToken();
    const createdByUserId = actor.userId ?? null;

    if (existing) {
      const rotated = await onsiteOpsAccessRepository.rotate({
        linkId: existing.id,
        tokenHash,
        publicToken: rawToken,
      });
      return { link: mapOwnerLink(rotated), rawToken };
    }

    const created = await onsiteOpsAccessRepository.create({
      eventId,
      tokenHash,
      publicToken: rawToken,
      createdByUserId,
    });
    return { link: mapOwnerLink(created), rawToken };
  },

  async rotateLink(
    actor: ActorContext,
    eventId: string,
  ): Promise<{ link: OnsiteOpsLinkOwnerVM; rawToken: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const existing = await onsiteOpsAccessRepository.findByEventId(eventId);
    if (!existing) {
      return this.ensureLink(actor, eventId);
    }

    const { rawToken, tokenHash } = await allocateUniqueToken();
    const rotated = await onsiteOpsAccessRepository.rotate({
      linkId: existing.id,
      tokenHash,
      publicToken: rawToken,
    });
    return { link: mapOwnerLink(rotated), rawToken };
  },

  async revokeLink(actor: ActorContext, eventId: string): Promise<OnsiteOpsLinkOwnerVM> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const existing = await onsiteOpsAccessRepository.findByEventId(eventId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "운영관리 링크가 없습니다.");
    }
    const revoked = await onsiteOpsAccessRepository.revoke(existing.id);
    return mapOwnerLink(revoked);
  },
};
