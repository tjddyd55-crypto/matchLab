import type { ActorContext } from "@/lib/auth/actor-context";
import type { PublicFighterCardDTO } from "@/lib/dto/public";
import type { UserRole } from "@/lib/enums";
import { eventRepository } from "@/lib/repositories/event.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { notFound } from "next/navigation";

/** 허용 역할이 아니면 FORBIDDEN (`requireActor*` 와 조합). */
export function requireRole(
  actor: ActorContext | null | undefined,
  allowed: readonly UserRole[],
): asserts actor is ActorContext {
  if (!actor || !allowed.includes(actor.role)) {
    throw new PermissionError("FORBIDDEN");
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
