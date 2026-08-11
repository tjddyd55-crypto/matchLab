import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  EventExternalRegistrationLinkStatus,
  EventStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import {
  buildExternalRegistrationPublicUrl,
  generateExternalRegistrationRawToken,
  hashExternalRegistrationToken,
  parseExternalRegistrationPublicToken,
  verifyExternalRegistrationPublicToken,
} from "@/lib/external-registration/token";
import { formatPublicDateTime } from "@/lib/date-display";

export type ExternalRegistrationLinkVM = {
  id: string;
  eventId: string;
  status: EventExternalRegistrationLinkStatus;
  url: string;
  createdAt: string;
  lastSubmittedAt: string | null;
  submissionCount: number;
  athleteCount: number;
  registrationEndDate: string;
  eventTitle: string;
  eventStatus: EventStatus;
};

function toVm(row: {
  id: string;
  eventId: string;
  tokenHash: string;
  status: EventExternalRegistrationLinkStatus;
  createdAt: Date;
  lastSubmittedAt: Date | null;
  submissionCount: number;
  athleteCount: number;
  event: {
    title: string;
    status: EventStatus;
    registrationEndDate: Date;
  };
}): ExternalRegistrationLinkVM {
  return {
    id: row.id,
    eventId: row.eventId,
    status: row.status,
    url: buildExternalRegistrationPublicUrl(row.id, row.tokenHash),
    createdAt: row.createdAt.toISOString(),
    lastSubmittedAt: row.lastSubmittedAt?.toISOString() ?? null,
    submissionCount: row.submissionCount,
    athleteCount: row.athleteCount,
    registrationEndDate: row.event.registrationEndDate.toISOString(),
    eventTitle: row.event.title,
    eventStatus: row.event.status,
  };
}

async function loadEventForLink(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      organizerId: true,
      title: true,
      status: true,
      registrationEndDate: true,
      eventDate: true,
      location: true,
      locationName: true,
      roadAddress: true,
      registrationStartDate: true,
      publicSlug: true,
    },
  });
  if (!event) throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
  return event;
}

export const externalRegistrationLinkService = {
  async getOrCreateLink(
    actor: ActorContext,
    eventId: string,
  ): Promise<ExternalRegistrationLinkVM> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const event = await loadEventForLink(eventId);

    const existing = await prisma.eventExternalRegistrationLink.findUnique({
      where: { eventId },
      include: {
        event: {
          select: {
            title: true,
            status: true,
            registrationEndDate: true,
          },
        },
      },
    });
    if (existing) return toVm(existing);

    const raw = generateExternalRegistrationRawToken();
    const tokenHash = hashExternalRegistrationToken(raw);
    const created = await prisma.eventExternalRegistrationLink.create({
      data: {
        eventId: event.id,
        organizerId: event.organizerId,
        tokenHash,
        label: "외부 체육관 선수등록",
        status: EventExternalRegistrationLinkStatus.active,
        createdByUserId: actor.userId,
      },
      include: {
        event: {
          select: {
            title: true,
            status: true,
            registrationEndDate: true,
          },
        },
      },
    });
    return toVm(created);
  },

  async getLink(
    actor: ActorContext,
    eventId: string,
  ): Promise<ExternalRegistrationLinkVM | null> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const row = await prisma.eventExternalRegistrationLink.findUnique({
      where: { eventId },
      include: {
        event: {
          select: {
            title: true,
            status: true,
            registrationEndDate: true,
          },
        },
      },
    });
    return row ? toVm(row) : null;
  },

  async revokeLink(actor: ActorContext, eventId: string): Promise<ExternalRegistrationLinkVM> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const row = await prisma.eventExternalRegistrationLink.findUnique({
      where: { eventId },
    });
    if (!row) throw new AppError("NOT_FOUND", "등록 링크가 없습니다.");
    const updated = await prisma.eventExternalRegistrationLink.update({
      where: { id: row.id },
      data: {
        status: EventExternalRegistrationLinkStatus.revoked,
        revokedAt: new Date(),
      },
      include: {
        event: {
          select: {
            title: true,
            status: true,
            registrationEndDate: true,
          },
        },
      },
    });
    return toVm(updated);
  },

  async regenerateLink(
    actor: ActorContext,
    eventId: string,
  ): Promise<ExternalRegistrationLinkVM> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const event = await loadEventForLink(eventId);
    const raw = generateExternalRegistrationRawToken();
    const tokenHash = hashExternalRegistrationToken(raw);

    const updated = await prisma.eventExternalRegistrationLink.upsert({
      where: { eventId },
      create: {
        eventId: event.id,
        organizerId: event.organizerId,
        tokenHash,
        label: "외부 체육관 선수등록",
        status: EventExternalRegistrationLinkStatus.active,
        createdByUserId: actor.userId,
      },
      update: {
        tokenHash,
        status: EventExternalRegistrationLinkStatus.active,
        revokedAt: null,
      },
      include: {
        event: {
          select: {
            title: true,
            status: true,
            registrationEndDate: true,
          },
        },
      },
    });
    return toVm(updated);
  },

  async resolvePublicToken(token: string): Promise<{
    ok: true;
    linkId: string;
    event: {
      id: string;
      title: string;
      eventDate: string;
      locationLabel: string;
      registrationEndDate: string;
      registrationEndLabel: string;
      status: EventStatus;
    };
    divisions: Array<{
      id: string;
      label: string;
      gender: string | null;
      ageGroup: string | null;
      weightClass: string | null;
      weightClassName: string | null;
      weightLimitText: string | null;
    }>;
    closedReason: string | null;
  } | { ok: false; reason: "invalid" | "revoked" | "expired" | "closed" }> {
    const parsed = parseExternalRegistrationPublicToken(token);
    if (!parsed) return { ok: false, reason: "invalid" };

    const link = await prisma.eventExternalRegistrationLink.findUnique({
      where: { id: parsed.linkId },
      include: {
        event: {
          include: {
            divisions: {
              orderBy: [{ ageGroup: "asc" }, { gender: "asc" }, { weightClass: "asc" }],
            },
          },
        },
      },
    });
    if (!link) return { ok: false, reason: "invalid" };
    if (
      !verifyExternalRegistrationPublicToken({
        linkId: link.id,
        tokenHash: link.tokenHash,
        signature: parsed.signature,
      })
    ) {
      return { ok: false, reason: "invalid" };
    }
    if (link.status !== EventExternalRegistrationLinkStatus.active || link.revokedAt) {
      return { ok: false, reason: "revoked" };
    }
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      return { ok: false, reason: "expired" };
    }

    const now = Date.now();
    let closedReason: string | null = null;
    if (link.event.status !== EventStatus.open) {
      closedReason = "선수 접수가 열려 있지 않습니다.";
    } else if (link.event.registrationStartDate.getTime() > now) {
      closedReason = "선수 접수가 아직 시작되지 않았습니다.";
    } else if (link.event.registrationEndDate.getTime() < now) {
      closedReason = "선수 접수가 마감되었습니다.";
    }

    const locationLabel =
      link.event.locationName?.trim() ||
      link.event.roadAddress?.trim() ||
      link.event.location?.trim() ||
      "";

    const { formatDivisionSearchLabel } = await import(
      "@/lib/event-division-fields"
    );

    return {
      ok: true,
      linkId: link.id,
      closedReason,
      event: {
        id: link.event.id,
        title: link.event.title,
        eventDate: link.event.eventDate.toISOString(),
        locationLabel,
        registrationEndDate: link.event.registrationEndDate.toISOString(),
        registrationEndLabel: formatPublicDateTime(
          link.event.registrationEndDate.toISOString(),
        ),
        status: link.event.status,
      },
      divisions: link.event.divisions.map((d) => ({
        id: d.id,
        label: formatDivisionSearchLabel(d),
        gender: d.gender,
        ageGroup: d.ageGroup,
        weightClass: d.weightClass,
        weightClassName: d.weightClassName,
        weightLimitText: d.weightLimitText,
      })),
    };
  },
};
