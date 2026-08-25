import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import {
  EventStatus,
  OrganizerStatus,
  OrganizerType,
} from "@/lib/enums";
import { isOrganizerFieldOperationsEventStatus } from "@/lib/organization-platform-status";
import { requireRole } from "@/lib/permissions";
import { eventRepository } from "@/lib/repositories/event.repository";
import { prisma } from "@/lib/prisma";

export type OrganizerPortalAccessMode =
  | "platform_active"
  | "platform_suspended"
  | "platform_archived"
  | "field_operations_only";

export type OrganizerPortalAccess = {
  organizerId: string;
  organizer: {
    id: string;
    name: string;
    type: OrganizerType;
    status: OrganizerStatus;
  };
  accessMode: OrganizerPortalAccessMode;
  canEnterPortal: boolean;
  canGeneralWrite: boolean;
  bannerMessage: string | null;
};

function platformOrganizerStatusBlocked(status: OrganizerStatus): {
  accessMode: "platform_suspended" | "platform_archived";
  canEnterPortal: false;
  canGeneralWrite: false;
  bannerMessage: string;
} {
  if (status === OrganizerStatus.archived) {
    return {
      accessMode: "platform_archived",
      canEnterPortal: false,
      canGeneralWrite: false,
      bannerMessage: "운영 종료된 조직입니다. MATCHON 관리자에게 문의해 주세요.",
    };
  }
  return {
    accessMode: "platform_suspended",
    canEnterPortal: false,
    canGeneralWrite: false,
    bannerMessage:
      "서비스 이용이 일시정지되었습니다. 현재 협회의 MATCHON 이용이 일시적으로 제한되어 있습니다. 관리자에게 문의해 주세요.",
  };
}

async function loadOrganizerForActor(actor: ActorContext) {
  if (!actor.organizerId) {
    throw new PermissionError("FORBIDDEN", "주최자 컨텍스트가 필요합니다.");
  }
  const organizer = await prisma.organizer.findUnique({
    where: { id: actor.organizerId },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
    },
  });
  if (!organizer) {
    throw new AppError("NOT_FOUND", "주최자를 찾을 수 없습니다.");
  }
  return organizer;
}

/**
 * 협회/주최자 플랫폼 상태 게이트 — Gym `platformGymStatusBlocked`와 대칭.
 * admin은 portal gate를 적용하지 않는다.
 */
export async function resolveOrganizerPortalAccess(
  actor: ActorContext,
  options?: { eventId?: string | null },
): Promise<OrganizerPortalAccess> {
  requireRole(actor, ["organizer", "admin"]);

  if (actor.role === "admin") {
    const organizerId = actor.organizerId ?? "admin-preview";
    return {
      organizerId,
      organizer: {
        id: organizerId,
        name: "Admin",
        type: OrganizerType.association,
        status: OrganizerStatus.active,
      },
      accessMode: "platform_active",
      canEnterPortal: true,
      canGeneralWrite: true,
      bannerMessage: null,
    };
  }

  const organizer = await loadOrganizerForActor(actor);

  if (organizer.status === OrganizerStatus.active) {
    return {
      organizerId: organizer.id,
      organizer,
      accessMode: "platform_active",
      canEnterPortal: true,
      canGeneralWrite: true,
      bannerMessage: null,
    };
  }

  if (organizer.status === OrganizerStatus.pending) {
    const blocked = platformOrganizerStatusBlocked(OrganizerStatus.suspended);
    return {
      organizerId: organizer.id,
      organizer,
      ...blocked,
    };
  }

  const eventId = options?.eventId?.trim();
  if (
    eventId &&
    organizer.status === OrganizerStatus.suspended
  ) {
    const eventStatus = await eventRepository.findEventStatus(eventId);
    if (
      eventStatus &&
      isOrganizerFieldOperationsEventStatus(eventStatus as EventStatus)
    ) {
      const ownerOrgId = await eventRepository.findEventOrganizerId(eventId);
      if (ownerOrgId === organizer.id) {
        return {
          organizerId: organizer.id,
          organizer,
          accessMode: "field_operations_only",
          canEnterPortal: true,
          canGeneralWrite: false,
          bannerMessage:
            "협회 이용이 일시정지되어 신규 업무는 제한됩니다. 진행 중인 대회 현장 운영만 이용할 수 있습니다.",
        };
      }
    }
  }

  const blocked = platformOrganizerStatusBlocked(organizer.status);
  return {
    organizerId: organizer.id,
    organizer,
    ...blocked,
  };
}

export async function requireOrganizerPortalRead(
  actor: ActorContext,
  options?: { eventId?: string | null },
): Promise<OrganizerPortalAccess> {
  const access = await resolveOrganizerPortalAccess(actor, options);
  if (!access.canEnterPortal) {
    throw new PermissionError(
      "FORBIDDEN",
      access.bannerMessage || "주최자 포털에 접근할 수 없습니다.",
    );
  }
  return access;
}

/** 신규 대회·회원사 등 일반 organizer write — suspended/archived 차단 */
export async function requireOrganizerPortalGeneralWrite(
  actor: ActorContext,
): Promise<OrganizerPortalAccess> {
  if (actor.role === "admin") {
    return resolveOrganizerPortalAccess(actor);
  }
  const access = await resolveOrganizerPortalAccess(actor);
  if (!access.canEnterPortal || !access.canGeneralWrite) {
    throw new PermissionError(
      "FORBIDDEN",
      access.bannerMessage ||
        "현재 조직 상태에서는 이 작업을 수행할 수 없습니다.",
    );
  }
  return access;
}
