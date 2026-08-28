import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import type {
  AdminApplicationListItemDTO,
  AdminAssociationDetailDTO,
  AdminAssociationListItemDTO,
  AdminAuditLogListItemDTO,
  AdminDashboardHomeDTO,
  AdminDashboardStatsDTO,
  AdminEventListItemDTO,
  AdminFighterListItemDTO,
  AdminGymDetailDTO,
  AdminGymListItemDTO,
  AdminMatchResultListItemDTO,
  AdminOrganizerListItemDTO,
} from "@/lib/dto/admin";
import { AppError } from "@/lib/errors/app-error";
import { formatPostalAddress } from "@/lib/postal-address";
import { adminRepository } from "@/lib/repositories/admin.repository";
import { fighterCareerRepository } from "@/lib/repositories/fighter-career.repository";
import { fighterCareerService } from "@/lib/services/fighter-career.service";
import { formatFighterCareerSummary } from "@/lib/fighter-career/types";

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
    ownerUserId: r.userId,
    loginId: r.user.loginId,
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
    ownerUserId: r.ownerUserId,
    loginId: r.ownerUser.loginId,
  };
}

function recordSummary(win: number, loss: number, draw: number): string {
  return `${win}승 ${loss}패 ${draw}무`;
}

function mapFighterRow(
  r: Awaited<ReturnType<typeof adminRepository.listAdminFighters>>[number],
  career?: {
    wins: number;
    losses: number;
    draws: number;
    noContests: number;
    totalMatches: number;
    lastMatchAt: Date | null;
  } | null,
): AdminFighterListItemDTO {
  return {
    id: r.id,
    fighterCode: r.fighterCode,
    name: r.name,
    gender: r.gender,
    currentGymName: r.currentGym?.name ?? null,
    recordSummary: recordSummary(r.recordWin, r.recordLoss, r.recordDraw),
    careerSummary: career
      ? formatFighterCareerSummary({
          wins: career.wins,
          losses: career.losses,
          draws: career.draws,
          noContests: career.noContests,
          totalMatches: career.totalMatches,
          knockouts: 0,
          submissions: 0,
          decisions: 0,
          lastMatchAt: career.lastMatchAt?.toISOString() ?? null,
        })
      : null,
    lastMatchAt: career?.lastMatchAt ? toIso(career.lastMatchAt) : null,
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
    gymId: r.gym?.id ?? "",
    gymName: r.gym?.name ?? "—",
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
    const stats = await fighterCareerRepository.findStatsByFighterIds(
      rows.map((r) => r.id),
    );
    const statsByFighter = new Map(stats.map((s) => [s.fighterId, s]));
    return rows.map((r) => mapFighterRow(r, statsByFighter.get(r.id) ?? null));
  },

  async getAdminFighterCareer(actor: ActorContext, fighterId: string) {
    assertAdmin(actor);
    return fighterCareerService.getFighterCareerProfile(fighterId);
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

  async listAdminAssociations(
    actor: ActorContext,
  ): Promise<AdminAssociationListItemDTO[]> {
    assertAdmin(actor);
    const rows = await adminRepository.listAdminAssociations();
    return rows.map((r) => {
      const app = r.associationApplicationsCreated[0] ?? null;
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        representativeName: app?.representativeName ?? r.user.name,
        contactPhone: app?.contactPhone ?? r.user.phone,
        contactEmail: app?.contactEmail ?? r.user.email,
        memberGymCount: r._count.associationMemberGyms,
        creditBalance: r.creditWallet?.balance ?? 0,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
        ownerUserId: r.userId,
        loginId: r.user.loginId,
      };
    });
  },

  async getAdminAssociationDetail(
    actor: ActorContext,
    organizerId: string,
  ): Promise<AdminAssociationDetailDTO> {
    assertAdmin(actor);
    const row = await adminRepository.getAdminAssociationById(organizerId);
    if (!row) {
      throw new AppError("NOT_FOUND", "협회를 찾을 수 없습니다.");
    }

    const app = row.associationApplicationsCreated[0] ?? null;
    const auditLogs = await adminRepository.listAdminAuditLogsForTarget(
      "Organizer",
      row.id,
    );
    // 가입 신청 감사도 함께 표시 (승인 이력)
    const appAuditLogs = app
      ? await adminRepository.listAdminAuditLogsForTarget(
          "AssociationApplication",
          app.id,
        )
      : [];
    const mergedAudit = [...auditLogs, ...appAuditLogs]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 50);

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      websiteUrl: row.websiteUrl,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      ownerUserId: row.userId,
      loginId: row.user.loginId,
      ownerName: row.user.name,
      ownerPhone: row.user.phone,
      ownerEmail: row.user.email,
      application: app
        ? {
            id: app.id,
            representativeName: app.representativeName,
            contactName: app.contactName,
            contactPhone: app.contactPhone,
            contactEmail: app.contactEmail,
            addressLabel:
              formatPostalAddress({
                postalCode: app.postalCode,
                address: app.address,
                addressDetail: app.addressDetail,
              }) || null,
            reviewedAt: app.reviewedAt ? toIso(app.reviewedAt) : null,
            submittedAt: toIso(app.submittedAt),
          }
        : null,
      summary: {
        memberGymCount: row._count.associationMemberGyms,
        eventCount: row._count.events,
        creditBalance: row.creditWallet?.balance ?? 0,
      },
      linkedGyms: row.associationMemberGyms.map((m) => ({
        membershipId: m.id,
        gymId: m.gym.id,
        gymName: m.gym.name,
        status: m.status,
        joinedAt: toIso(m.joinedAt),
        memberCode: m.memberCode,
      })),
      events: row.events.map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        eventDate: toIso(e.eventDate),
        publicSlug: e.publicSlug,
      })),
      creditLedgers: row.creditLedgers.map((l) => ({
        id: l.id,
        type: l.type,
        amount: l.amount,
        balanceAfter: l.balanceAfter,
        reason: l.reason,
        memo: l.memo,
        createdAt: toIso(l.createdAt),
      })),
      auditLogs: mergedAudit.map(mapAuditRow),
    };
  },

  async getAdminGymDetail(
    actor: ActorContext,
    gymId: string,
  ): Promise<AdminGymDetailDTO> {
    assertAdmin(actor);
    const row = await adminRepository.getAdminGymById(gymId);
    if (!row) {
      throw new AppError("NOT_FOUND", "체육관을 찾을 수 없습니다.");
    }

    const app = row.gymApplicationsCreated[0] ?? null;
    const auditLogs = await adminRepository.listAdminAuditLogsForTarget(
      "Gym",
      row.id,
    );
    const appAuditLogs = app
      ? await adminRepository.listAdminAuditLogsForTarget(
          "GymApplication",
          app.id,
        )
      : [];
    const mergedAudit = [...auditLogs, ...appAuditLogs]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 50);

    const participationMap = new Map<
      string,
      {
        eventId: string;
        eventTitle: string;
        eventStatus: (typeof row.applications)[number]["event"]["status"];
        eventDate: Date;
        applicationCount: number;
      }
    >();
    for (const a of row.applications) {
      const existing = participationMap.get(a.event.id);
      if (existing) {
        existing.applicationCount += 1;
        continue;
      }
      participationMap.set(a.event.id, {
        eventId: a.event.id,
        eventTitle: a.event.title,
        eventStatus: a.event.status,
        eventDate: a.event.eventDate,
        applicationCount: 1,
      });
    }
    const eventParticipations = [...participationMap.values()]
      .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())
      .map((e) => ({
        eventId: e.eventId,
        eventTitle: e.eventTitle,
        eventStatus: e.eventStatus,
        eventDate: toIso(e.eventDate),
        applicationCount: e.applicationCount,
      }));

    return {
      id: row.id,
      name: row.name,
      status: row.status,
      phone: row.phone,
      address: row.address,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      ownerUserId: row.ownerUserId,
      loginId: row.ownerUser.loginId,
      ownerName: row.ownerUser.name,
      ownerPhone: row.ownerUser.phone,
      ownerEmail: row.ownerUser.email,
      application: app
        ? {
            id: app.id,
            representativeName: app.representativeName,
            contactName: app.contactName,
            mobilePhone: app.mobilePhone,
            email: app.email,
            addressLabel:
              formatPostalAddress({
                postalCode: app.postalCode,
                address: app.address,
                addressDetail: app.addressDetail,
              }) || null,
            businessNo: app.businessNo,
            reviewedAt: app.reviewedAt ? toIso(app.reviewedAt) : null,
            submittedAt: toIso(app.submittedAt),
          }
        : null,
      summary: {
        memberCount: row._count.gymMembers,
        fighterCount: row._count.fighters,
        associationLinkCount: row._count.associationMemberGyms,
        eventParticipationCount: eventParticipations.length,
      },
      associationLinks: row.associationMemberGyms.map((m) => ({
        membershipId: m.id,
        organizerId: m.organizer.id,
        associationName: m.organizer.name,
        status: m.status,
        joinedAt: toIso(m.joinedAt),
      })),
      eventParticipations,
      auditLogs: mergedAudit.map(mapAuditRow),
    };
  },
};
