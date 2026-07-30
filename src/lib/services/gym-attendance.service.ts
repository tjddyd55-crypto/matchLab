import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { AuditAction, GymMemberAttendanceSource } from "@/lib/enums";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import {
  attendanceDeskMessage,
  decideGymAttendanceEligibility,
} from "@/lib/gym-attendance/eligibility";
import {
  maskMemberName,
  maskPhoneForAdminList,
  isValidKoreanMobilePhone,
  normalizeAttendancePhone,
} from "@/lib/gym-attendance/privacy";
import {
  checkGymAttendanceRateLimit,
  clearGymAttendanceLookupFailures,
  recordGymAttendanceLookupFailure,
} from "@/lib/gym-attendance/rate-limit";
import {
  formatSeoulTimeHm,
  getSeoulCurrentMonthRange,
  getSeoulMonthRange,
  getSeoulWeekRange,
  parseSeoulDateOnlyString,
  toSeoulAttendanceDate,
  toSeoulDateOnlyString,
} from "@/lib/gym-attendance/seoul-date";
import {
  buildGymAttendanceKioskUrl,
  generateGymAttendanceKioskToken,
  hashAttendancePhoneKey,
  hashGymAttendanceKioskToken,
} from "@/lib/gym-attendance/token";
import { getGymMemberMembershipStatusLabel } from "@/lib/gym-member-membership-status";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { createGymMemberImageSignedReadUrlMap } from "@/lib/services/gym-member-image.service";
import { gymAttendanceRepository } from "@/lib/repositories/gym-attendance.repository";
import { prisma } from "@/lib/prisma";

export type PublicCheckInStatus =
  | "created"
  | "already_checked_in"
  | "not_found"
  | "ambiguous"
  | "blocked"
  | "rate_limited"
  | "invalid_phone"
  | "kiosk_inactive";

export type PublicCheckInResult = {
  success: boolean;
  status: PublicCheckInStatus;
  /** 성공(created / already_checked_in)에서만 전체 이름. 실패·ambiguous에는 없음. */
  displayMemberName?: string;
  attendanceTime?: string;
  message: string;
  needsDeskNotice?: boolean;
};

function publicFail(
  status: PublicCheckInStatus,
  message: string,
): PublicCheckInResult {
  return { success: false, status, message };
}

export const gymAttendanceService = {
  // ─── Kiosk admin ─────────────────────────────────────────────

  async listKiosks(actor: ActorContext) {
    const access = await requireGymPortalRead(actor);
    return gymAttendanceRepository.listKiosks(access.gymId);
  },

  async createKiosk(
    actor: ActorContext,
    input: { name: string; allowExpiredMember?: boolean; allowPausedMember?: boolean },
  ) {
    const access = await requireGymPortalWrite(actor);
    const name = input.name.trim();
    if (!name) {
      throw new AppError("VALIDATION_ERROR", "키오스크 이름을 입력해 주세요.");
    }

    const rawToken = generateGymAttendanceKioskToken();
    const row = await gymAttendanceRepository.createKiosk({
      gymId: access.gymId,
      name,
      publicTokenHash: hashGymAttendanceKioskToken(rawToken),
      allowExpiredMember: input.allowExpiredMember ?? true,
      allowPausedMember: input.allowPausedMember ?? true,
      createdByUserId: actor.userId,
    });

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_attendance_kiosk_created,
      targetType: "GymAttendanceKiosk",
      targetId: row.id,
      afterData: { gymId: access.gymId, name: row.name },
    });

    return {
      kiosk: row,
      rawToken,
      path: buildGymAttendanceKioskUrl(rawToken),
    };
  },

  async setKioskActive(
    actor: ActorContext,
    kioskId: string,
    isActive: boolean,
  ) {
    const access = await requireGymPortalWrite(actor);
    const existing = await gymAttendanceRepository.findKioskForGym(
      kioskId,
      access.gymId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", "키오스크를 찾을 수 없습니다.");
    }

    const updated = await gymAttendanceRepository.updateKiosk(kioskId, {
      isActive,
      revokedAt: isActive ? null : new Date(),
    });

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: isActive
        ? AuditAction.gym_attendance_kiosk_updated
        : AuditAction.gym_attendance_kiosk_revoked,
      targetType: "GymAttendanceKiosk",
      targetId: kioskId,
      beforeData: { isActive: existing.isActive },
      afterData: { isActive: updated.isActive },
    });

    return updated;
  },

  async regenerateKioskToken(actor: ActorContext, kioskId: string) {
    const access = await requireGymPortalWrite(actor);
    const existing = await gymAttendanceRepository.findKioskForGym(
      kioskId,
      access.gymId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", "키오스크를 찾을 수 없습니다.");
    }

    const rawToken = generateGymAttendanceKioskToken();
    const updated = await gymAttendanceRepository.updateKiosk(kioskId, {
      publicTokenHash: hashGymAttendanceKioskToken(rawToken),
      isActive: true,
      revokedAt: null,
    });

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_attendance_kiosk_token_regenerated,
      targetType: "GymAttendanceKiosk",
      targetId: kioskId,
      afterData: { gymId: access.gymId },
    });

    return {
      kiosk: updated,
      rawToken,
      path: buildGymAttendanceKioskUrl(rawToken),
    };
  },

  // ─── Public kiosk context / check-in ─────────────────────────

  async getPublicKioskContext(rawToken: string) {
    const tokenHash = hashGymAttendanceKioskToken(rawToken);
    const kiosk = await gymAttendanceRepository.findKioskByTokenHash(tokenHash);
    if (!kiosk || kiosk.revokedAt || !kiosk.isActive) {
      return { ok: false as const, reason: "inactive" as const };
    }
    if (kiosk.gym.status !== "active") {
      return { ok: false as const, reason: "inactive" as const };
    }
    return {
      ok: true as const,
      gymName: kiosk.gym.name,
      kioskName: kiosk.name,
    };
  },

  async checkInByPhone(input: {
    rawToken: string;
    phone: string;
    ip: string;
  }): Promise<PublicCheckInResult> {
    const tokenHash = hashGymAttendanceKioskToken(input.rawToken);
    const tokenHashPrefix = tokenHash.slice(0, 16);
    const normalized = normalizeAttendancePhone(input.phone);

    if (!isValidKoreanMobilePhone(normalized)) {
      return publicFail(
        "invalid_phone",
        "올바른 휴대폰 번호를 입력해 주세요.",
      );
    }

    const phoneHash = hashAttendancePhoneKey(normalized);
    const rate = checkGymAttendanceRateLimit({
      tokenHashPrefix,
      ip: input.ip,
      phoneHash,
    });
    if (!rate.ok) {
      return publicFail(
        "rate_limited",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const kiosk = await gymAttendanceRepository.findKioskByTokenHash(tokenHash);
    if (!kiosk || kiosk.revokedAt || !kiosk.isActive || kiosk.gym.status !== "active") {
      return publicFail(
        "kiosk_inactive",
        "출석 화면을 사용할 수 없습니다. 데스크에 문의해 주세요.",
      );
    }

    const members = await gymAttendanceRepository.findActiveMembersByPhone(
      kiosk.gymId,
      normalized,
    );

    if (members.length === 0) {
      const failRate = recordGymAttendanceLookupFailure({
        tokenHashPrefix,
        phoneHash,
      });
      if (!failRate.ok) {
        return publicFail(
          "rate_limited",
          "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
      return publicFail(
        "not_found",
        "등록된 회원 정보를 찾을 수 없습니다.\n전화번호를 확인하거나 데스크에 문의해 주세요.",
      );
    }

    if (members.length > 1) {
      return publicFail(
        "ambiguous",
        "회원 정보를 확인할 수 없습니다.\n데스크에 문의해 주세요.",
      );
    }

    const member = members[0]!;
    const endsAt = member.subscriptions[0]?.endsAt ?? null;
    const eligibility = decideGymAttendanceEligibility({
      deletedAt: member.deletedAt,
      memberStatus: member.status,
      endsAt,
      allowExpiredMember: kiosk.allowExpiredMember,
      allowPausedMember: kiosk.allowPausedMember,
    });

    if (!eligibility.allow) {
      return publicFail(
        "blocked",
        "출석할 수 없는 회원 상태입니다.\n데스크에 문의해 주세요.",
      );
    }

    const now = new Date();
    const attendanceDate = toSeoulAttendanceDate(now);
    const existing = await gymAttendanceRepository.findAttendanceByMemberDate(
      kiosk.gymId,
      member.id,
      attendanceDate,
    );

    if (existing && !existing.deletedAt) {
      clearGymAttendanceLookupFailures({ tokenHashPrefix, phoneHash });
      await gymAttendanceRepository.touchKioskLastUsed(kiosk.id, now);
      return {
        success: true,
        status: "already_checked_in",
        displayMemberName: member.name.trim(),
        attendanceTime: formatSeoulTimeHm(existing.attendedAt),
        message: "오늘 이미 출석하셨습니다.",
        needsDeskNotice: false,
      };
    }

    const deskMsg = attendanceDeskMessage(eligibility.deskNoticeKind);

    await prisma.$transaction(async (tx) => {
      if (existing?.deletedAt) {
        await gymAttendanceRepository.restoreAttendance(
          existing.id,
          {
            attendedAt: now,
            source: GymMemberAttendanceSource.kiosk,
            kioskSessionId: kiosk.id,
            createdByUserId: null,
            note: null,
            membershipStatusSnapshot: eligibility.membershipStatus,
          },
          tx,
        );
      } else {
        await gymAttendanceRepository.createAttendance(
          {
            gymId: kiosk.gymId,
            gymMemberId: member.id,
            attendedAt: now,
            attendanceDate,
            source: GymMemberAttendanceSource.kiosk,
            kioskSessionId: kiosk.id,
            membershipStatusSnapshot: eligibility.membershipStatus,
          },
          tx,
        );
      }
      await gymAttendanceRepository.touchKioskLastUsed(kiosk.id, now, tx);
    });

    const baseMessage = deskMsg
      ? `출석이 기록되었습니다.\n${deskMsg}`
      : "출석이 완료되었습니다.";

    clearGymAttendanceLookupFailures({ tokenHashPrefix, phoneHash });

    return {
      success: true,
      status: "created",
      displayMemberName: member.name.trim(),
      attendanceTime: formatSeoulTimeHm(now),
      message: baseMessage,
      needsDeskNotice: eligibility.needsDeskNotice,
    };
  },

  // ─── Admin summary / list / manual / cancel ──────────────────

  async getGymAttendanceSummary(actor: ActorContext) {
    const access = await requireGymPortalRead(actor);
    const now = new Date();
    const today = toSeoulAttendanceDate(now);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const week = getSeoulWeekRange(now);
    const month = getSeoulCurrentMonthRange(now);

    const [todayCount, weekCount, monthCount, deskNoticeCount] =
      await Promise.all([
        gymAttendanceRepository.countAttendances(
          access.gymId,
          today,
          tomorrow,
        ),
        gymAttendanceRepository.countAttendances(
          access.gymId,
          week.start,
          week.endExclusive,
        ),
        gymAttendanceRepository.countAttendances(
          access.gymId,
          month.start,
          month.endExclusive,
        ),
        gymAttendanceRepository.countDeskNoticeToday(access.gymId, today),
      ]);

    return {
      todayCount,
      weekCount,
      monthCount,
      todayFirstVisitCount: todayCount,
      deskNoticeCount,
      todayDate: toSeoulDateOnlyString(now),
    };
  },

  async listAttendances(
    actor: ActorContext,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      memberNameQ?: string;
      phoneTail?: string;
      memberStatus?: string;
      source?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const access = await requireGymPortalRead(actor);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));
    const dateFrom = filters.dateFrom
      ? parseSeoulDateOnlyString(filters.dateFrom)
      : undefined;
    const dateToParsed = filters.dateTo
      ? parseSeoulDateOnlyString(filters.dateTo)
      : undefined;
    let dateToExclusive: Date | undefined;
    if (dateToParsed) {
      dateToExclusive = new Date(dateToParsed);
      dateToExclusive.setUTCDate(dateToExclusive.getUTCDate() + 1);
    }

    const source =
      filters.source === "kiosk" || filters.source === "admin_manual"
        ? (filters.source as GymMemberAttendanceSource)
        : undefined;

    const { rows, total } = await gymAttendanceRepository.listAttendances({
      gymId: access.gymId,
      dateFrom: dateFrom ?? undefined,
      dateToExclusive,
      memberNameQ: filters.memberNameQ?.trim() || undefined,
      phoneTail: filters.phoneTail?.replace(/\D/g, "").slice(-4) || undefined,
      memberStatus: filters.memberStatus || undefined,
      source,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const imageUrlByPath = await createGymMemberImageSignedReadUrlMap(
      access.gymId,
      rows.map((r) => r.gymMember.profileImagePath),
    );

    return {
      total,
      page,
      pageSize,
      rows: rows.map((r) => {
        const endsAt = r.gymMember.subscriptions[0]?.endsAt ?? null;
        return {
          id: r.id,
          attendedAt: r.attendedAt,
          attendanceDate: r.attendanceDate,
          source: r.source,
          note: r.note,
          membershipStatusSnapshot: r.membershipStatusSnapshot,
          memberId: r.gymMember.id,
          memberName: r.gymMember.name,
          memberProfileImageUrl: r.gymMember.profileImagePath
            ? (imageUrlByPath.get(r.gymMember.profileImagePath) ?? null)
            : null,
          maskedPhone: maskPhoneForAdminList(r.gymMember.phone),
          memberStatus: r.gymMember.status,
          planName: r.gymMember.subscriptions[0]?.planNameSnapshot ?? null,
          endsAt,
        };
      }),
    };
  },

  async createManualAttendance(
    actor: ActorContext,
    input: {
      gymMemberId: string;
      attendedAt?: string;
      note?: string;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymAttendanceRepository.findMemberForGym(
      input.gymMemberId,
      access.gymId,
    );
    if (!member) {
      throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    }

    const attendedAt = input.attendedAt
      ? new Date(input.attendedAt)
      : new Date();
    if (Number.isNaN(attendedAt.getTime())) {
      throw new AppError("VALIDATION_ERROR", "출석 시각이 올바르지 않습니다.");
    }
    if (attendedAt.getTime() > Date.now() + 60_000) {
      throw new AppError("VALIDATION_ERROR", "미래 시각으로 출석할 수 없습니다.");
    }

    const attendanceDate = toSeoulAttendanceDate(attendedAt);
    const eligibility = decideGymAttendanceEligibility({
      deletedAt: member.deletedAt,
      memberStatus: member.status,
      endsAt: member.subscriptions[0]?.endsAt ?? null,
      allowExpiredMember: true,
      allowPausedMember: true,
    });
    if (!eligibility.allow) {
      throw new AppError(
        "VALIDATION_ERROR",
        "출석할 수 없는 회원 상태입니다.",
      );
    }

    const existing = await gymAttendanceRepository.findAttendanceByMemberDate(
      access.gymId,
      member.id,
      attendanceDate,
    );
    if (existing && !existing.deletedAt) {
      throw new AppError(
        "CONFLICT",
        "해당 날짜에 이미 출석 기록이 있습니다.",
      );
    }

    const row = await prisma.$transaction(async (tx) => {
      const saved = existing?.deletedAt
        ? await gymAttendanceRepository.restoreAttendance(
            existing.id,
            {
              attendedAt,
              source: GymMemberAttendanceSource.admin_manual,
              createdByUserId: actor.userId,
              note: input.note?.trim() || null,
              membershipStatusSnapshot: eligibility.membershipStatus,
              kioskSessionId: null,
            },
            tx,
          )
        : await gymAttendanceRepository.createAttendance(
            {
              gymId: access.gymId,
              gymMemberId: member.id,
              attendedAt,
              attendanceDate,
              source: GymMemberAttendanceSource.admin_manual,
              createdByUserId: actor.userId,
              note: input.note?.trim() || null,
              membershipStatusSnapshot: eligibility.membershipStatus,
            },
            tx,
          );

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_attendance_manual_created,
          targetType: "GymMemberAttendance",
          targetId: saved.id,
          afterData: {
            gymId: access.gymId,
            gymMemberId: member.id,
            attendanceDate: toSeoulDateOnlyString(attendedAt),
          },
        },
        tx,
      );
      return saved;
    });

    return row;
  },

  async cancelAttendance(
    actor: ActorContext,
    attendanceId: string,
    reason?: string,
  ) {
    const access = await requireGymPortalWrite(actor);
    const row = await gymAttendanceRepository.findAttendanceForGym(
      attendanceId,
      access.gymId,
    );
    if (!row || row.deletedAt) {
      throw new AppError("NOT_FOUND", "출석 기록을 찾을 수 없습니다.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await gymAttendanceRepository.softCancelAttendance(
        attendanceId,
        {
          deletedAt: new Date(),
          cancelledByUserId: actor.userId,
          cancellationReason: reason?.trim() || null,
        },
        tx,
      );
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_attendance_cancelled,
          targetType: "GymMemberAttendance",
          targetId: attendanceId,
          beforeData: {
            gymMemberId: row.gymMemberId,
            attendanceDate: row.attendanceDate.toISOString(),
          },
          afterData: { deleted: true },
        },
        tx,
      );
      return cancelled;
    });

    return {
      attendance: updated,
      memberName: maskMemberName(row.gymMember.name),
    };
  },

  async getGymMemberAttendanceSummary(
    actor: ActorContext,
    gymMemberId: string,
  ) {
    const access = await requireGymPortalRead(actor);
    const member = await gymAttendanceRepository.findMemberForGym(
      gymMemberId,
      access.gymId,
    );
    if (!member) {
      throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    }

    const now = new Date();
    const month = getSeoulCurrentMonthRange(now);
    const days30Start = toSeoulAttendanceDate(now);
    days30Start.setUTCDate(days30Start.getUTCDate() - 29);
    const tomorrow = toSeoulAttendanceDate(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [monthCount, last30Count, totalCount, latest] = await Promise.all([
      gymAttendanceRepository.countMemberAttendances(
        access.gymId,
        gymMemberId,
        month.start,
        month.endExclusive,
      ),
      gymAttendanceRepository.countMemberAttendances(
        access.gymId,
        gymMemberId,
        days30Start,
        tomorrow,
      ),
      gymAttendanceRepository.countMemberAttendances(
        access.gymId,
        gymMemberId,
      ),
      gymAttendanceRepository.findLatestMemberAttendance(
        access.gymId,
        gymMemberId,
      ),
    ]);

    return {
      monthCount,
      last30Count,
      totalCount,
      latestAttendedAt: latest?.attendedAt ?? null,
      latestAttendanceDate: latest?.attendanceDate ?? null,
    };
  },

  async getGymMemberAttendanceCalendar(
    actor: ActorContext,
    gymMemberId: string,
    year: number,
    month1to12: number,
  ) {
    const access = await requireGymPortalRead(actor);
    const member = await gymAttendanceRepository.findMemberForGym(
      gymMemberId,
      access.gymId,
    );
    if (!member) {
      throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    }
    if (month1to12 < 1 || month1to12 > 12 || year < 2000 || year > 2100) {
      throw new AppError("VALIDATION_ERROR", "달력 기간이 올바르지 않습니다.");
    }

    const range = getSeoulMonthRange(year, month1to12);
    const rows = await gymAttendanceRepository.listMemberCalendar({
      gymId: access.gymId,
      gymMemberId,
      rangeStart: range.start,
      rangeEndExclusive: range.endExclusive,
    });

    return {
      year,
      month: month1to12,
      days: rows.map((r) => ({
        id: r.id,
        day: r.attendanceDate.getUTCDate(),
        attendanceDate: r.attendanceDate,
        attendedAt: r.attendedAt,
        source: r.source,
        note: r.note,
        membershipStatusSnapshot: r.membershipStatusSnapshot,
        membershipStatusLabel: r.membershipStatusSnapshot
          ? getGymMemberMembershipStatusLabel(
              r.membershipStatusSnapshot as never,
            )
          : null,
      })),
    };
  },

  /** 홈 요약용 최소 지표 */
  async getHomeAttendanceSnippet(actor: ActorContext) {
    try {
      return await this.getGymAttendanceSummary(actor);
    } catch {
      return null;
    }
  },
};
