import "server-only";

import { randomUUID } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";
import {
  AuditAction,
  GymMemberRegistrationRequestStatus,
  GymMemberSelfRegistrationLinkStatus,
} from "@/lib/enums";
import { requireGymPortalRead, requireGymPortalWrite } from "@/lib/gym-portal-access";
import { parseDateOnlyString, toUtcDateOnly } from "@/lib/date-only";
import { normalizeGymFighterPhone } from "@/lib/gym-fighter-management";
import { formatPhoneNumber } from "@/lib/phone";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";
import { gymMemberSelfRegistrationRepository as repo } from "@/lib/repositories/gym-member-self-registration.repository";
import {
  gymMemberService,
  type GymMemberCreateInput,
} from "@/lib/services/gym-member.service";
import {
  buildDefaultSelfRegistrationTermsContent,
  DEFAULT_SELF_REGISTRATION_TERMS_TITLE,
} from "@/lib/gym-member-self-registration/constants";
import { isMinorBirthDate } from "@/lib/gym-member-self-registration/age";
import {
  healthSnapshotHasYes,
  type ConsentSnapshot,
  type FormSnapshot,
  type HealthSnapshot,
  type PublicSelfRegistrationContext,
} from "@/lib/gym-member-self-registration/types";
import {
  selfRegistrationSubmitSchema,
  type SelfRegistrationSubmitInput,
} from "@/lib/gym-member-self-registration/validation";
import {
  buildGymMemberSelfRegistrationPublicUrl,
  generateGymMemberSelfRegistrationRawToken,
  hashGymMemberSelfRegistrationToken,
  parseGymMemberSelfRegistrationPublicToken,
  verifyGymMemberSelfRegistrationPublicToken,
} from "@/lib/gym-member-self-registration/token";
import { checkGymMemberSelfRegistrationRateLimit } from "@/lib/gym-member-self-registration/rate-limit";
import {
  createSelfRegistrationSignatureReadUrl,
  storeSelfRegistrationSignaturePng,
} from "@/lib/services/gym-member-self-registration-signature.service";

const TX = { maxWait: 15_000, timeout: 30_000 } as const;

async function ensureActiveTerms(gymId: string, gymName: string) {
  const existing = await repo.findActiveTerms(gymId);
  if (existing) return existing;
  return prisma.$transaction(async (tx) => {
    const still = await tx.gymMemberRegistrationTerms.findFirst({
      where: { gymId, isActive: true },
      orderBy: { version: "desc" },
    });
    if (still) return still;
    return repo.createTerms(
      {
        gym: { connect: { id: gymId } },
        version: 1,
        title: DEFAULT_SELF_REGISTRATION_TERMS_TITLE,
        content: buildDefaultSelfRegistrationTermsContent(gymName),
        isActive: true,
      },
      tx,
    );
  }, TX);
}

export const gymMemberSelfRegistrationService = {
  async getOrCreateLink(actor: ActorContext): Promise<{
    id: string;
    status: GymMemberSelfRegistrationLinkStatus;
    url: string | null;
    rawToken: string | null;
    gymName: string;
    submissionCount: number;
    lastSubmittedAt: string | null;
    pendingCount: number;
    terms: { version: number; title: string; content: string };
  }> {
    const access = await requireGymPortalWrite(actor);
    const gymId = access.gymId;
    const gymName = access.gym.name;
    const terms = await ensureActiveTerms(gymId, gymName);
    const pendingCount = await repo.countPending(gymId);
    let link = await repo.findLinkByGymId(gymId);
    if (!link) {
      const rawToken = generateGymMemberSelfRegistrationRawToken();
      link = await repo.createLink({
        gym: { connect: { id: gymId } },
        tokenHash: hashGymMemberSelfRegistrationToken(rawToken),
        status: GymMemberSelfRegistrationLinkStatus.active,
        createdByUserId: actor.userId,
      });
      await auditRepository.createAuditLog({
        actorUserId: actor.userId,
        action: AuditAction.gym_member_self_registration_link_created,
        targetType: "GymMemberSelfRegistrationLink",
        targetId: link.id,
        afterData: { gymId },
      });
    }
    return {
      id: link.id,
      status: link.status,
      url:
        link.status === GymMemberSelfRegistrationLinkStatus.active
          ? buildGymMemberSelfRegistrationPublicUrl(link.id, link.tokenHash)
          : null,
      rawToken: null,
      gymName,
      submissionCount: link.submissionCount,
      lastSubmittedAt: link.lastSubmittedAt?.toISOString() ?? null,
      pendingCount,
      terms: {
        version: terms.version,
        title: terms.title,
        content: terms.content,
      },
    };
  },

  async regenerateLink(actor: ActorContext): Promise<{
    url: string;
    rawToken: string;
    status: GymMemberSelfRegistrationLinkStatus;
  }> {
    const access = await requireGymPortalWrite(actor);
    const existing = await repo.findLinkByGymId(access.gymId);
    const rawToken = generateGymMemberSelfRegistrationRawToken();
    const tokenHash = hashGymMemberSelfRegistrationToken(rawToken);
    const row = existing
      ? await repo.updateLink(existing.id, {
          tokenHash,
          status: GymMemberSelfRegistrationLinkStatus.active,
          revokedAt: null,
        })
      : await repo.createLink({
          gym: { connect: { id: access.gymId } },
          tokenHash,
          status: GymMemberSelfRegistrationLinkStatus.active,
          createdByUserId: actor.userId,
        });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: existing
        ? AuditAction.gym_member_self_registration_link_regenerated
        : AuditAction.gym_member_self_registration_link_created,
      targetType: "GymMemberSelfRegistrationLink",
      targetId: row.id,
      afterData: { gymId: access.gymId },
    });
    return {
      url: buildGymMemberSelfRegistrationPublicUrl(row.id, row.tokenHash),
      rawToken,
      status: row.status,
    };
  },

  async revokeLink(actor: ActorContext) {
    const access = await requireGymPortalWrite(actor);
    const existing = await repo.findLinkByGymId(access.gymId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "셀프등록 링크가 없습니다.");
    }
    await repo.updateLink(existing.id, {
      status: GymMemberSelfRegistrationLinkStatus.revoked,
      revokedAt: new Date(),
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_self_registration_link_revoked,
      targetType: "GymMemberSelfRegistrationLink",
      targetId: existing.id,
      afterData: { gymId: access.gymId },
    });
  },

  async updateTerms(
    actor: ActorContext,
    input: { title: string; content: string },
  ) {
    const access = await requireGymPortalWrite(actor);
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title) throw new AppError("VALIDATION_ERROR", "제목을 입력해 주세요.");
    if (!content) throw new AppError("VALIDATION_ERROR", "내용을 입력해 주세요.");
    if (title.length > 80) {
      throw new AppError("VALIDATION_ERROR", "제목이 너무 깁니다.");
    }
    if (content.length > 8000) {
      throw new AppError("VALIDATION_ERROR", "내용이 너무 깁니다.");
    }

    const created = await prisma.$transaction(async (tx) => {
      await repo.deactivateTermsForGym(access.gymId, tx);
      const latest = await repo.findLatestTermsVersion(access.gymId, tx);
      const nextVersion = (latest?.version ?? 0) + 1;
      return repo.createTerms(
        {
          gym: { connect: { id: access.gymId } },
          version: nextVersion,
          title,
          content,
          isActive: true,
        },
        tx,
      );
    }, TX);

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_self_registration_terms_updated,
      targetType: "GymMemberRegistrationTerms",
      targetId: created.id,
      afterData: { gymId: access.gymId, version: created.version },
    });
    return created;
  },

  async resolvePublicLink(publicToken: string) {
    const parsed = parseGymMemberSelfRegistrationPublicToken(publicToken);
    if (!parsed) return null;
    const link = await repo.findLinkById(parsed.linkId);
    if (!link) return null;
    const ok = verifyGymMemberSelfRegistrationPublicToken({
      linkId: link.id,
      tokenHash: link.tokenHash,
      signature: parsed.signature,
    });
    if (!ok) return null;
    return link;
  },

  async getPublicContext(rawToken: string): Promise<PublicSelfRegistrationContext> {
    const link = await this.resolvePublicLink(rawToken);
    if (!link) return { ok: false, reason: "not_found" };
    if (link.status !== GymMemberSelfRegistrationLinkStatus.active) {
      return { ok: false, reason: "revoked" };
    }
    const terms = await ensureActiveTerms(link.gymId, link.gym.name);
    return {
      ok: true,
      gymId: link.gymId,
      gymName: link.gym.name,
      logoUrl: null,
      termsTitle: terms.title,
      termsVersion: terms.version,
      termsContent: terms.content,
    };
  },

  async submitPublic(input: {
    payload: SelfRegistrationSubmitInput;
    memberSignature: Uint8Array;
    guardianSignature?: Uint8Array | null;
    ip: string;
  }): Promise<{ requestId: string; duplicate: boolean }> {
    const parsed = selfRegistrationSubmitSchema.parse(input.payload);
    const link = await this.resolvePublicLink(parsed.token);
    const rate = checkGymMemberSelfRegistrationRateLimit({
      tokenHashPrefix: (link?.tokenHash ?? parsed.token).slice(0, 16),
      ip: input.ip,
    });
    if (!rate.ok) {
      throw new AppError(
        "VALIDATION_ERROR",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    if (!link || link.status !== GymMemberSelfRegistrationLinkStatus.active) {
      throw new AppError(
        "FORBIDDEN",
        "현재 회원 등록을 받을 수 없습니다.",
      );
    }

    const existingSame = await repo.findRequestByClientSubmission(
      link.id,
      parsed.clientSubmissionId,
    );
    if (existingSame) {
      return { requestId: existingSame.id, duplicate: false };
    }

    const birthDate = parseDateOnlyString(parsed.birthDate);
    if (!birthDate) {
      throw new AppError("VALIDATION_ERROR", "생년월일이 올바르지 않습니다.");
    }
    const minor = isMinorBirthDate(birthDate);
    if (minor && (!input.guardianSignature || input.guardianSignature.byteLength === 0)) {
      throw new AppError("VALIDATION_ERROR", "미성년자는 보호자 서명이 필요합니다.");
    }
    if (!input.memberSignature.byteLength) {
      throw new AppError("VALIDATION_ERROR", "회원 서명이 필요합니다.");
    }

    const phone = normalizeGymFighterPhone(parsed.phone);
    if (!phone) {
      throw new AppError("VALIDATION_ERROR", "연락처를 입력해 주세요.");
    }
    const guardianPhone = parsed.guardianPhone
      ? normalizeGymFighterPhone(parsed.guardianPhone)
      : null;
    const terms = await ensureActiveTerms(link.gymId, link.gym.name);
    const health = parsed.health as HealthSnapshot;
    const now = new Date();
    const requestId = randomUUID();

    const signaturePath = await storeSelfRegistrationSignaturePng({
      gymId: link.gymId,
      requestId,
      kind: "member",
      bytes: input.memberSignature,
    });
    let guardianSignaturePath: string | null = null;
    if (minor && input.guardianSignature) {
      guardianSignaturePath = await storeSelfRegistrationSignaturePng({
        gymId: link.gymId,
        requestId,
        kind: "guardian",
        bytes: input.guardianSignature,
      });
    }

    const formSnapshot: FormSnapshot = {
      name: parsed.name,
      gender: parsed.gender,
      birthDate: parsed.birthDate,
      phone: formatPhoneNumber(phone) || phone,
      postalCode: parsed.postalCode,
      address: parsed.address,
      addressDetail: parsed.addressDetail,
      occupationOrSchool: parsed.occupationOrSchool,
      guardianName: parsed.guardianName,
      guardianPhone: guardianPhone
        ? formatPhoneNumber(guardianPhone) || guardianPhone
        : undefined,
      preferredTimeBand: parsed.preferredTimeBand,
      purposeText: parsed.purposeText,
      experienceText: parsed.experienceText,
    };
    const consentSnapshot: ConsentSnapshot = {
      privacyAgreed: true,
      privacyAgreedAt: now.toISOString(),
      termsAgreed: true,
      termsAgreedAt: now.toISOString(),
      termsVersion: terms.version,
      termsTitle: terms.title,
      termsContent: terms.content,
      ...(minor ? { guardianConsentAgreed: true } : {}),
    };

    try {
      await prisma.$transaction(async (tx) => {
        await repo.createRequest(
          {
            id: requestId,
            gym: { connect: { id: link.gymId } },
            link: { connect: { id: link.id } },
            status: GymMemberRegistrationRequestStatus.pending,
            name: parsed.name,
            phone: formatPhoneNumber(phone) || phone,
            normalizedPhone: phone,
            birthDate: toUtcDateOnly(birthDate),
            gender: parsed.gender,
            postalCode: parsed.postalCode ?? null,
            address: parsed.address ?? null,
            addressDetail: parsed.addressDetail ?? null,
            occupationOrSchool: parsed.occupationOrSchool ?? null,
            guardianName: parsed.guardianName ?? null,
            guardianPhone: guardianPhone,
            preferredTimeBand: parsed.preferredTimeBand ?? null,
            purposeText: parsed.purposeText ?? null,
            experienceText: parsed.experienceText ?? null,
            healthHasAnyYes: healthSnapshotHasYes(health),
            formSnapshot,
            healthSnapshot: health,
            consentSnapshot,
            signaturePath,
            signatureSignedAt: now,
            guardianSignaturePath,
            guardianSignedAt: guardianSignaturePath ? now : null,
            termsVersion: terms.version,
            termsTitle: terms.title,
            termsContent: terms.content,
            privacyAgreedAt: now,
            termsAgreedAt: now,
            clientSubmissionId: parsed.clientSubmissionId,
          },
          tx,
        );
        await repo.incrementLinkSubmission(link.id, tx);
        await auditRepository.createAuditLog(
          {
            actorUserId: null,
            action: AuditAction.gym_member_self_registration_submitted,
            targetType: "GymMemberRegistrationRequest",
            targetId: requestId,
            afterData: { gymId: link.gymId },
          },
          tx,
        );
      }, TX);
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        const again = await repo.findRequestByClientSubmission(
          link.id,
          parsed.clientSubmissionId,
        );
        if (again) return { requestId: again.id, duplicate: false };
      }
      throw e;
    }

    return { requestId, duplicate: false };
  },

  async countPending(actor: ActorContext) {
    const access = await requireGymPortalRead(actor);
    return repo.countPending(access.gymId);
  },

  async listRequests(
    actor: ActorContext,
    input: {
      status?: GymMemberRegistrationRequestStatus;
      page?: number;
    },
  ) {
    const access = await requireGymPortalRead(actor);
    const page = Math.max(1, input.page ?? 1);
    const pageSize = 30;
    const [rows, total] = await repo.listRequests(access.gymId, {
      status: input.status,
      page,
      pageSize,
    });
    return { rows, total, page, pageSize };
  },

  async getRequestDetail(actor: ActorContext, requestId: string) {
    const access = await requireGymPortalRead(actor);
    const row = await repo.findRequestById(access.gymId, requestId);
    if (!row) throw new AppError("NOT_FOUND", "등록 요청을 찾을 수 없습니다.");
    const [memberSignatureUrl, guardianSignatureUrl, duplicates] =
      await Promise.all([
        createSelfRegistrationSignatureReadUrl(row.signaturePath),
        row.guardianSignaturePath
          ? createSelfRegistrationSignatureReadUrl(row.guardianSignaturePath)
          : Promise.resolve(null),
        gymMemberRepository.findDuplicateCandidates(access.gymId, {
          name: row.name,
          phone: row.normalizedPhone,
          birthDate: row.birthDate,
        }),
      ]);
    return {
      ...row,
      memberSignatureUrl,
      guardianSignatureUrl,
      duplicates,
    };
  },

  async getDocumentForMember(actor: ActorContext, gymMemberId: string) {
    const access = await requireGymPortalRead(actor);
    const row = await repo.findRequestByApprovedMember(access.gymId, gymMemberId);
    if (!row) return null;
    return this.getRequestDetail(actor, row.id);
  },

  async approveRequest(
    actor: ActorContext,
    input: { requestId: string; confirmDuplicate?: boolean },
  ): Promise<{ memberId: string }> {
    const access = await requireGymPortalWrite(actor);
    const row = await repo.findRequestById(access.gymId, input.requestId);
    if (!row) throw new AppError("NOT_FOUND", "등록 요청을 찾을 수 없습니다.");
    if (row.status !== GymMemberRegistrationRequestStatus.pending) {
      throw new AppError("CONFLICT", "이미 처리된 신청입니다.");
    }

    const memoParts = ["[셀프등록 승인]"];
    if (row.occupationOrSchool) memoParts.push(`직업/학교 ${row.occupationOrSchool}`);
    if (row.experienceText) memoParts.push(`운동경력 ${row.experienceText}`);
    if (row.purposeText) memoParts.push(`운동목적 ${row.purposeText}`);
    if (row.preferredTimeBand) memoParts.push(`희망시간 ${row.preferredTimeBand}`);
    if (row.healthHasAnyYes) memoParts.push("건강정보 확인 필요 — 가입 신청서 참고");

    const createInput: GymMemberCreateInput = {
      name: row.name,
      phone: row.normalizedPhone,
      joinedAt: undefined,
      birthDate: row.birthDate,
      gender: row.gender ?? undefined,
      email: undefined,
      postalCode: row.postalCode ?? undefined,
      address: row.address ?? undefined,
      addressDetail: row.addressDetail ?? undefined,
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
      guardianName: row.guardianName ?? undefined,
      guardianPhone: row.guardianPhone ?? undefined,
      primarySport: undefined,
      rankName: undefined,
      memo: memoParts.join("\n"),
      profileImagePath: undefined,
      smsOptOut: false,
      confirmDuplicate: Boolean(input.confirmDuplicate),
      planId: undefined,
      subscriptionStartedAt: undefined,
      subscriptionEndsAt: undefined,
      paymentAmount: undefined,
      paymentMethod: undefined,
      paymentMemo: undefined,
      groupIds: [],
      lockerEnabled: false,
      lockerLabel: undefined,
      lockerStartedAt: undefined,
      lockerEndsAt: undefined,
      lockerAmount: undefined,
      lockerMemo: undefined,
      registerAsFighter: false,
      height: undefined,
      weight: undefined,
      fighterPrimarySport: undefined,
      createLoginAccount: false,
      loginId: undefined,
      password: undefined,
    };
    const created = await gymMemberService.createMember(actor, createInput);

    await prisma.$transaction(async (tx) => {
      await repo.updateRequest(
        row.id,
        {
          status: GymMemberRegistrationRequestStatus.approved,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          approvedGymMember: { connect: { id: created.memberId } },
        },
        tx,
      );
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_self_registration_approved,
          targetType: "GymMemberRegistrationRequest",
          targetId: row.id,
          afterData: { gymMemberId: created.memberId },
        },
        tx,
      );
    }, TX);

    return { memberId: created.memberId };
  },

  async rejectRequest(
    actor: ActorContext,
    input: { requestId: string; reason?: string },
  ) {
    const access = await requireGymPortalWrite(actor);
    const row = await repo.findRequestById(access.gymId, input.requestId);
    if (!row) throw new AppError("NOT_FOUND", "등록 요청을 찾을 수 없습니다.");
    if (row.status !== GymMemberRegistrationRequestStatus.pending) {
      throw new AppError("CONFLICT", "이미 처리된 신청입니다.");
    }
    await repo.updateRequest(row.id, {
      status: GymMemberRegistrationRequestStatus.rejected,
      reviewedAt: new Date(),
      reviewedByUserId: actor.userId,
      rejectReason: input.reason?.trim() || null,
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_self_registration_rejected,
      targetType: "GymMemberRegistrationRequest",
      targetId: row.id,
      afterData: { gymId: access.gymId },
    });
  },
};
