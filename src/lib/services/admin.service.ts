import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import type {
  AdminApplicationListItemDTO,
  AdminAuditLogListItemDTO,
  AdminDashboardHomeDTO,
  AdminDashboardStatsDTO,
  AdminEventListItemDTO,
  AdminFighterListItemDTO,
  AdminGymListItemDTO,
  AdminMatchResultListItemDTO,
  AdminOrganizerListItemDTO,
} from "@/lib/dto/admin";
import { AppError } from "@/lib/errors/app-error";
import { adminRepository } from "@/lib/repositories/admin.repository";

const RECENT_HOME = 10;
const AUDIT_LOG_PAGE_LIMIT = 200;

function assertAdmin(actor: ActorContext): void {
  if (actor.role !== "admin") {
    throw new AppError("FORBIDDEN", "관리자만 접근할 수 있습니다.");
  }
}

function toIso(d: Date): string {
  return d.toISOString();
}

function mapStats(row: Awaited<
  ReturnType<typeof adminRepository.getAdminDashboardStats>
>): AdminDashboardStatsDTO {
  return { ...row };
}

function mapEventRow(
  r: Awaited<ReturnType<typeof adminRepository.listAdminEvents>>[number],
): AdminEventListItemDTO {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    eventDate: toIso(r.eventDate),
    publicSlug: r.publicSlug,
    organizerId: r.organizer.id,
    organizerName: r.organizer.name,
    applicationCount: r._count.applications,
    bracketCount: r._count.brackets,
  };
}

function mapOrganizerRow(
  r: Awaited<ReturnType<typeof adminRepository.listAdminOrganizers>>[number],
): AdminOrganizerListItemDTO {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    status: r.status,
    eventCount: r._count.events,
    createdAt: toIso(r.createdAt),
  };
}

function mapGymRow(
  r: Awaited<ReturnType<typeof adminRepository.listAdminGyms>>[number],
): AdminGymListItemDTO {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    fighterCount: r._count.fighters,
    applicationCount: r._count.applications,
    createdAt: toIso(r.createdAt),
  };
}

function recordSummary(win: number, loss: number, draw: number): string {
  return `${win}승 ${loss}패 ${draw}무`;
}

function mapFighterRow(
  r: Awaited<ReturnType<typeof adminRepository.listAdminFighters>>[number],
): AdminFighterListItemDTO {
  return {
    id: r.id,
    fighterCode: r.fighterCode,
    name: r.name,
    gender: r.gender,
    currentGymName: r.currentGym?.name ?? null,
    recordSummary: recordSummary(r.recordWin, r.recordLoss, r.recordDraw),
    status: r.status,
    createdAt: toIso(r.createdAt),
  };
}

function mapApplicationRow(
  r: Awaited<
    ReturnType<typeof adminRepository.listAdminApplications>
  >[number],
): AdminApplicationListItemDTO {
  return {
    id: r.id,
    eventId: r.event.id,
    eventTitle: r.event.title,
    eventPublicSlug: r.event.publicSlug,
    fighterId: r.fighter.id,
    fighterName: r.fighter.name,
    fighterCode: r.fighter.fighterCode,
    gymId: r.gym.id,
    gymName: r.gym.name,
    status: r.status,
    paymentStatus: r.paymentStatus,
    createdAt: toIso(r.createdAt),
  };
}

function mapMatchResultRow(
  r: Awaited<
    ReturnType<typeof adminRepository.listAdminMatchResults>
  >[number],
): AdminMatchResultListItemDTO {
  return {
    id: r.id,
    eventId: r.event.id,
    eventTitle: r.event.title,
    eventPublicSlug: r.event.publicSlug,
    fighterName: r.fighter.name,
    fighterCode: r.fighter.fighterCode,
    opponentName: r.opponentFighter?.name ?? null,
    opponentCode: r.opponentFighter?.fighterCode ?? null,
    result: r.result,
    resultType: r.resultType,
    status: r.status,
    matchDate: toIso(r.matchDate),
    confirmedAt: r.confirmedAt ? toIso(r.confirmedAt) : null,
    createdAt: toIso(r.createdAt),
  };
}

function mapAuditRow(
  r: Awaited<ReturnType<typeof adminRepository.listAdminAuditLogs>>[number],
): AdminAuditLogListItemDTO {
  const u = r.actorUser;
  const actorLabel = u
    ? u.email ?? u.name ?? "내부 사용자"
    : r.actorUserId
      ? "이전 계정/미연결"
      : "시스템";

  return {
    id: r.id,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    actorLabel,
    createdAt: toIso(r.createdAt),
  };
}

export const adminService = {
  async getAdminDashboard(actor: ActorContext): Promise<AdminDashboardHomeDTO> {
    assertAdmin(actor);
    const [
      statsRow,
      recentEvents,
      recentApplications,
      recentMatchResults,
      recentAuditLogs,
    ] = await Promise.all([
      adminRepository.getAdminDashboardStats(),
      adminRepository.listAdminEvents(RECENT_HOME),
      adminRepository.listAdminApplications(RECENT_HOME),
      adminRepository.listAdminMatchResults(RECENT_HOME),
      adminRepository.listAdminAuditLogs(RECENT_HOME),
    ]);

    return {
      stats: mapStats(statsRow),
      recentEvents: recentEvents.map(mapEventRow),
      recentApplications: recentApplications.map(mapApplicationRow),
      recentMatchResults: recentMatchResults.map(mapMatchResultRow),
      recentAuditLogs: recentAuditLogs.map(mapAuditRow),
    };
  },

  async listAdminEvents(actor: ActorContext): Promise<AdminEventListItemDTO[]> {
    assertAdmin(actor);
    const rows = await adminRepository.listAdminEvents();
    return rows.map(mapEventRow);
  },

  async listAdminOrganizers(
    actor: ActorContext,
  ): Promise<AdminOrganizerListItemDTO[]> {
    assertAdmin(actor);
    const rows = await adminRepository.listAdminOrganizers();
    return rows.map(mapOrganizerRow);
  },

  async listAdminGyms(actor: ActorContext): Promise<AdminGymListItemDTO[]> {
    assertAdmin(actor);
    const rows = await adminRepository.listAdminGyms();
    return rows.map(mapGymRow);
  },

  async listAdminFighters(actor: ActorContext): Promise<AdminFighterListItemDTO[]> {
    assertAdmin(actor);
    const rows = await adminRepository.listAdminFighters();
    return rows.map(mapFighterRow);
  },

  async listAdminApplications(
    actor: ActorContext,
  ): Promise<AdminApplicationListItemDTO[]> {
    assertAdmin(actor);
    const rows = await adminRepository.listAdminApplications();
    return rows.map(mapApplicationRow);
  },

  async listAdminMatchResults(
    actor: ActorContext,
  ): Promise<AdminMatchResultListItemDTO[]> {
    assertAdmin(actor);
    const rows = await adminRepository.listAdminMatchResults();
    return rows.map(mapMatchResultRow);
  },

  async listAdminAuditLogs(
    actor: ActorContext,
  ): Promise<AdminAuditLogListItemDTO[]> {
    assertAdmin(actor);
    const rows = await adminRepository.listAdminAuditLogs(AUDIT_LOG_PAGE_LIMIT);
    return rows.map(mapAuditRow);
  },
};
