import type { ActorContext } from "@/lib/auth/actor-context";
import type { PublicFighterCardDTO } from "@/lib/dto/public";
import { EventStatus, OrganizerType, type UserRole } from "@/lib/enums";
import { eventRepository } from "@/lib/repositories/event.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { notFound } from "next/navigation";
import {
  isOrganizerFieldOperationsEventStatus,
} from "@/lib/organization-platform-status";
import { requireOrganizerPortalGeneralWrite } from "@/lib/organizer-portal-access";
import { prisma } from "@/lib/prisma";
import { OrganizerStatus } from "@/lib/enums";

/** 허용 역할이 아니면 FORBIDDEN (`requireActor*` 와 조합). */
export function requireRole(
  actor: ActorContext | null | undefined,
  allowed: readonly UserRole[],
): asserts actor is ActorContext {
  if (!actor || !allowed.includes(actor.role)) {
    throw new PermissionError("FORBIDDEN");
  }
}

/**
 * 협회 회원사 관리 — association organizer만 허용.
 * admin은 명시적 organizerId가 있을 때만 보조 접근.
 * UI 메뉴 숨김만으로 권한을 처리하지 않는다.
 */
export function resolveAssociationOrganizerScope(
  actor: ActorContext,
  explicitOrganizerId?: string | null,
): string {
  if (actor.role === "admin") {
    const id = explicitOrganizerId?.trim();
    if (!id) {
      throw new AppError(
        "FORBIDDEN",
        "관리자는 organizerId를 지정해야 회원사 관리에 접근할 수 있습니다.",
      );
    }
    return id;
  }
  requireRole(actor, ["organizer"]);
  if (!actor.organizerId) {
    throw new PermissionError("FORBIDDEN", "주최자 컨텍스트가 없습니다.");
  }
  if (actor.organizerType !== OrganizerType.association) {
    throw new PermissionError(
      "FORBIDDEN",
      "협회 주최자만 회원사 관리를 사용할 수 있습니다.",
    );
  }
  return actor.organizerId;
}

/**
 * 협회 organizer write/read API — platform active 필수.
 * suspended 시 member-gym 등 일반 업무 차단 (Event field ops는 별도 gate).
 */
export async function requireAssociationOrganizerScope(
  actor: ActorContext,
  explicitOrganizerId?: string | null,
): Promise<string> {
  if (actor.role === "organizer") {
    await requireOrganizerPortalGeneralWrite(actor);
  }
  return resolveAssociationOrganizerScope(actor, explicitOrganizerId);
}

export function requireAssociationOrganizerPage(
  actor: ActorContext,
  explicitOrganizerId?: string | null,
): string {
  try {
    return resolveAssociationOrganizerScope(actor, explicitOrganizerId);
  } catch (e) {
    if (e instanceof PermissionError || e instanceof AppError) notFound();
    throw e;
  }
}

export async function requireOrganizerForEvent(
  actor: ActorContext,
  eventId: string,
): Promise<void> {
  if (actor.role === "admin") return;
  requireRole(actor, ["organizer"]);

  const ownerOrgId = await eventRepository.findEventOrganizerId(eventId);
  if (!ownerOrgId) {
    throw new PermissionError("NOT_FOUND", "대회를 찾을 수 없습니다.");
  }
  if (actor.organizerId !== ownerOrgId) {
    throw new PermissionError("FORBIDDEN");
  }

  if (!actor.organizerId) return;

  const organizer = await prisma.organizer.findUnique({
    where: { id: actor.organizerId },
    select: { status: true },
  });
  if (!organizer) {
    throw new PermissionError("NOT_FOUND", "주최자를 찾을 수 없습니다.");
  }

  if (organizer.status === OrganizerStatus.active) return;

  if (organizer.status === OrganizerStatus.suspended) {
    const eventStatus = await eventRepository.findEventStatus(eventId);
    if (
      eventStatus &&
      isOrganizerFieldOperationsEventStatus(eventStatus as EventStatus)
    ) {
      return;
    }
    throw new PermissionError(
      "FORBIDDEN",
      "협회 이용이 일시정지되어 이 대회 작업을 수행할 수 없습니다.",
    );
  }

  throw new PermissionError(
    "FORBIDDEN",
    "현재 조직 상태에서는 대회 작업을 수행할 수 없습니다.",
  );
}

/** 신규 대회·일반 organizer mutation용 — platform active 필수 */
export async function requireOrganizerPlatformActiveForWrite(
  actor: ActorContext,
): Promise<void> {
  await requireOrganizerPortalGeneralWrite(actor);
}

/** 주최자 대회 페이지 — 권한·미존재 시 500 대신 404 */
export async function requireOrganizerForEventPage(
  actor: ActorContext,
  eventId: string,
): Promise<void> {
  try {
    await requireOrganizerForEvent(actor, eventId);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
}

/** getOrganizerEventDetail 등 서비스 호출 catch용 */
export function resolveOrganizerEventPageError(e: unknown): never {
  if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
  if (e instanceof PermissionError) notFound();
  throw e;
}

export async function requireGymOwner(
  actor: ActorContext,
  gymId: string,
): Promise<void> {
  if (actor.role === "admin") return;
  requireRole(actor, ["gym"]);
  if (actor.gymId !== gymId) {
    throw new PermissionError("FORBIDDEN");
  }
}

/** 체육관 owner 또는 해당 gym의 활성 선생님 */
export async function requireGymStaff(
  actor: ActorContext,
  gymId: string,
): Promise<void> {
  if (actor.role === "admin") return;
  if (actor.role === "gym") {
    await requireGymOwner(actor, gymId);
    return;
  }
  requireRole(actor, ["gym_staff"]);
  if (actor.gymId !== gymId || !actor.gymStaffId) {
    throw new PermissionError("FORBIDDEN");
  }
}

/** 체육관 관장만 (선생님 계정·매출·설정 등) */
export function isGymPortalOwner(actor: ActorContext): boolean {
  return actor.role === "admin" || actor.role === "gym";
}

/** 관리 UI·내부 서비스용 조회 — 비-organizer 는 false */
export async function canManageEvent(
  actor: ActorContext,
  eventId: string,
): Promise<boolean> {
  if (actor.role === "admin") return true;
  if (actor.role !== "organizer" || !actor.organizerId) return false;
  const ownerOrgId = await eventRepository.findEventOrganizerId(eventId);
  return Boolean(ownerOrgId && ownerOrgId === actor.organizerId);
}

/**
 * 내부 선수 상세 조회 허용 — admin / 해당 gym 소속 관장 / 본인 fighter.
 * organizer 단독은 이벤트 맥락 없이 허용하지 않는다 (`roles-permissions.md`).
 */
export async function canViewFighter(
  actor: ActorContext,
  fighterId: string,
): Promise<boolean> {
  if (actor.role === "admin") return true;

  const ctx = await fighterRepository.findFighterVisibilityContext(fighterId);
  if (!ctx) return false;

  if (actor.role === "fighter" && actor.fighterId === fighterId) return true;

  if (
    actor.role === "gym" &&
    actor.gymId &&
    ctx.currentGymId === actor.gymId
  ) {
    return true;
  }

  return false;
}

/** 결과 확정 등 — admin 또는 해당 대회 주최 organizer */
export async function canConfirmResult(
  actor: ActorContext,
  eventId: string,
): Promise<boolean> {
  if (actor.role === "admin") return true;
  if (actor.role !== "organizer" || !actor.organizerId) return false;
  const ownerOrgId = await eventRepository.findEventOrganizerId(eventId);
  return Boolean(ownerOrgId && ownerOrgId === actor.organizerId);
}

/** 내부 Fighter 등에서 공개 카드로 올릴 때 — 원본 엔티티 전체를 넘기지 말고 안전 필드만 채운다. */
export type FighterPublicMappingInput = {
  id: string;
  fighterCode: string;
  name: string;
  profileImageUrl: string | null;
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
  gymName?: string | null;
  weightClassLabel?: string | null;
  sportTypeLabel?: string | null;
};

export function toPublicFighterDTO(
  source: FighterPublicMappingInput,
): PublicFighterCardDTO {
  return {
    fighterId: source.id,
    fighterCode: source.fighterCode,
    displayName: source.name,
    gymName: source.gymName ?? null,
    weightClassLabel: source.weightClassLabel ?? null,
    sportTypeLabel: source.sportTypeLabel ?? null,
    profileImageUrl: source.profileImageUrl ?? null,
    recordWin: source.recordWin,
    recordLoss: source.recordLoss,
    recordDraw: source.recordDraw,
  };
}
