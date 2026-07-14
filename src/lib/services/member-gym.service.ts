import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AssociationJoinLinkStatus,
  AssociationMemberGymApplicationStatus,
  AssociationMemberGymStatus,
  OrganizerType,
} from "@/lib/enums";
import {
  generateMemberGymJoinToken,
  hashMemberGymJoinToken,
} from "@/lib/member-gym/token";
import {
  DEFAULT_MEMBER_GYM_SETTINGS,
  parseMemberGymSettings,
  type MemberGymSettingsV1,
} from "@/lib/member-gym/settings";
import { resolveAssociationOrganizerScope } from "@/lib/permissions";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";
import { gymRepository } from "@/lib/repositories/gym.repository";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";
import { prisma } from "@/lib/prisma";
import type { AssociationMemberGymApplicationAttachmentType } from "@/lib/enums";

export type MemberGymJoinGateResult =
  | { ok: true; link: NonNullable<Awaited<ReturnType<typeof memberGymRepository.findJoinLinkByTokenHash>>> }
  | {
      ok: false;
      reason:
        | "not_found"
        | "inactive"
        | "revoked"
        | "expired"
        | "max_uses"
        | "organizer";
    };

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function buildMemberGymRegisterUrl(token: string): string {
  return `${appBaseUrl()}/member-gym-register/${token}`;
}

export function evaluateMemberGymJoinGate(
  link: Awaited<ReturnType<typeof memberGymRepository.findJoinLinkByTokenHash>>,
): MemberGymJoinGateResult {
  if (!link) return { ok: false, reason: "not_found" };
  if (link.organizer.type !== OrganizerType.association) {
    return { ok: false, reason: "organizer" };
  }
  if (link.status === AssociationJoinLinkStatus.revoked || link.revokedAt) {
    return { ok: false, reason: "revoked" };
  }
  if (link.status !== AssociationJoinLinkStatus.active) {
    return { ok: false, reason: "inactive" };
  }
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (link.maxUses != null && link.usedCount >= link.maxUses) {
    return { ok: false, reason: "max_uses" };
  }
  return { ok: true, link };
}

function formatMemberCode(prefix: string, padding: number, n: number): string {
  return `${prefix}-${String(n).padStart(padding, "0")}`;
}

export const memberGymService = {
  evaluateMemberGymJoinGate,
  buildMemberGymRegisterUrl,

  async getSettings(actor: ActorContext, organizerIdHint?: string | null) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const row = await memberGymRepository.getOrCreateSettings(organizerId);
    return {
      organizerId,
      settings: parseMemberGymSettings(row.settingsJson),
    };
  },

  async saveSettings(
    actor: ActorContext,
    settings: MemberGymSettingsV1,
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const normalized = parseMemberGymSettings(settings);
    await memberGymRepository.updateSettings(organizerId, normalized);
    return normalized;
  },

  async getOverview(actor: ActorContext, organizerIdHint?: string | null) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const [memberGroups, appGroups, recent, activeLinks] = await Promise.all([
      memberGymRepository.countMemberGymsByStatus(organizerId),
      memberGymRepository.countApplicationsByStatus(organizerId),
      memberGymRepository.recentApplications(organizerId),
      memberGymRepository.countActiveLinks(organizerId),
    ]);

    const memberCount = (s: AssociationMemberGymStatus) =>
      memberGroups.find((g) => g.status === s)?._count._all ?? 0;
    const appCount = (s: AssociationMemberGymApplicationStatus) =>
      appGroups.find((g) => g.status === s)?._count._all ?? 0;

    return {
      totals: {
        memberGyms: memberGroups.reduce((a, g) => a + g._count._all, 0),
        active: memberCount(AssociationMemberGymStatus.active),
        pending: memberCount(AssociationMemberGymStatus.pending),
        suspended: memberCount(AssociationMemberGymStatus.suspended),
        withdrawn: memberCount(AssociationMemberGymStatus.withdrawn),
        applicationsPending:
          appCount(AssociationMemberGymApplicationStatus.submitted) +
          appCount(AssociationMemberGymApplicationStatus.under_review) +
          appCount(AssociationMemberGymApplicationStatus.resubmitted),
        supplementation: appCount(
          AssociationMemberGymApplicationStatus.supplementation_requested,
        ),
        onHold: appCount(AssociationMemberGymApplicationStatus.on_hold),
        activeLinks,
      },
      recent,
    };
  },

  async listLinks(actor: ActorContext, organizerIdHint?: string | null) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    return memberGymRepository.listJoinLinks(organizerId);
  },

  async createLink(
    actor: ActorContext,
    input: {
      label: string;
      expiresAt?: string | null;
      maxUses?: number | null;
      allowDuplicateApplication?: boolean;
    },
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const settings = parseMemberGymSettings(
      (await memberGymRepository.getOrCreateSettings(organizerId)).settingsJson,
    );
    const token = generateMemberGymJoinToken();
    const tokenHash = hashMemberGymJoinToken(token);

    let expiresAt: Date | null = null;
    if (input.expiresAt?.trim()) {
      expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw new AppError("VALIDATION_ERROR", "만료일시 형식이 올바르지 않습니다.");
      }
    } else if (settings.joinLink.defaultExpiresDays != null) {
      expiresAt = new Date(
        Date.now() + settings.joinLink.defaultExpiresDays * 86400000,
      );
    }

    const row = await memberGymRepository.createJoinLink({
      organizerId,
      label: input.label.trim(),
      tokenHash,
      expiresAt,
      maxUses:
        input.maxUses ?? settings.joinLink.defaultMaxUses ?? null,
      allowDuplicateApplication:
        input.allowDuplicateApplication ??
        settings.joinLink.allowDuplicateApplication,
      createdByUserId: actor.userId,
    });

    return {
      id: row.id,
      token,
      url: buildMemberGymRegisterUrl(token),
    };
  },

  async setLinkStatus(
    actor: ActorContext,
    linkId: string,
    status: AssociationJoinLinkStatus,
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const link = await memberGymRepository.findJoinLinkById(organizerId, linkId);
    if (!link) throw new AppError("NOT_FOUND", "가입 링크를 찾을 수 없습니다.");
    return memberGymRepository.updateJoinLink(linkId, {
      status,
      revokedAt:
        status === AssociationJoinLinkStatus.revoked ? new Date() : link.revokedAt,
    });
  },

  async getPublicRegistrationContext(token: string) {
    const tokenHash = hashMemberGymJoinToken(token);
    const link = await memberGymRepository.findJoinLinkByTokenHash(tokenHash);
    const gate = evaluateMemberGymJoinGate(link);
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const settings = parseMemberGymSettings(
      (
        await memberGymRepository.getOrCreateSettings(gate.link.organizerId)
      ).settingsJson,
    );
    return {
      ok: true as const,
      link: {
        id: gate.link.id,
        label: gate.link.label,
        organizerName: gate.link.organizer.name,
        attachments: gate.link.attachments.map((a) => ({
          id: a.id,
          kind: a.kind,
          originalFileName: a.originalFileName,
          mimeType: a.mimeType,
        })),
      },
      settings,
    };
  },

  async submitApplication(
    token: string,
    input: {
      gymName: string;
      ownerName: string;
      ownerNameEn?: string;
      birthDate?: string;
      gender?: string;
      phone: string;
      gymPhone?: string;
      email: string;
      homeAddress?: string;
      gymAddress: string;
      gymAddressDetail?: string;
      businessNo?: string;
      sportType?: string;
      classDescription?: string;
      qualifications?: string;
      careerSummary?: string;
      memo?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      privacyConsent: boolean;
      registrationConsent: boolean;
      smsConsent?: boolean;
      informationConsent?: boolean;
      signatureName: string;
      signatureConsent: boolean;
      uploadBatchId?: string;
      attachments?: {
        attachmentType: AssociationMemberGymApplicationAttachmentType;
        storagePath: string;
        originalFileName: string;
        mimeType: string;
        sizeBytes: number;
      }[];
    },
  ) {
    const tokenHash = hashMemberGymJoinToken(token);
    const link = await memberGymRepository.findJoinLinkByTokenHash(tokenHash);
    const gate = evaluateMemberGymJoinGate(link);
    if (!gate.ok) {
      throw new AppError("FORBIDDEN", "유효하지 않거나 만료된 가입 링크입니다.");
    }

    if (!input.privacyConsent || !input.registrationConsent) {
      throw new AppError("VALIDATION_ERROR", "필수 동의 항목에 동의해 주세요.");
    }
    if (!input.signatureConsent || !input.signatureName.trim()) {
      throw new AppError("VALIDATION_ERROR", "신청인 확인이 필요합니다.");
    }

    const settings = parseMemberGymSettings(
      (
        await memberGymRepository.getOrCreateSettings(gate.link.organizerId)
      ).settingsJson,
    );

    if (!gate.link.allowDuplicateApplication) {
      const dup = await prisma.associationMemberGymApplication.findFirst({
        where: {
          organizerId: gate.link.organizerId,
          joinLinkId: gate.link.id,
          phone: input.phone.trim(),
          status: {
            notIn: [
              AssociationMemberGymApplicationStatus.rejected,
              AssociationMemberGymApplicationStatus.withdrawn,
            ],
          },
        },
      });
      if (dup) {
        throw new AppError("CONFLICT", "이미 접수된 신청이 있습니다.");
      }
    }

    const attachments = input.attachments ?? [];
    if (settings.form.requireRepresentativePhoto) {
      const has = attachments.some(
        (a) => a.attachmentType === "representative_photo",
      );
      if (!has) {
        throw new AppError("VALIDATION_ERROR", "증명사진을 첨부해 주세요.");
      }
    }
    if (settings.form.requireBusinessRegistration) {
      const has = attachments.some(
        (a) => a.attachmentType === "business_registration",
      );
      if (!has) {
        throw new AppError("VALIDATION_ERROR", "사업자등록증을 첨부해 주세요.");
      }
    }

    const bucket =
      process.env.SUPABASE_MEMBER_GYM_FILES_BUCKET?.trim() || "member-gym-files";

    const birthDate = input.birthDate?.trim()
      ? new Date(input.birthDate)
      : null;

    const application = await prisma.$transaction(async (tx) => {
      const created = await memberGymRepository.createApplication(
        {
          organizer: { connect: { id: gate.link.organizerId } },
          joinLink: { connect: { id: gate.link.id } },
          status: AssociationMemberGymApplicationStatus.submitted,
          gymName: input.gymName.trim(),
          ownerName: input.ownerName.trim(),
          ownerNameEn: input.ownerNameEn?.trim() || null,
          birthDate:
            birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : null,
          gender: input.gender?.trim() || null,
          phone: input.phone.trim(),
          gymPhone: input.gymPhone?.trim() || null,
          email: input.email.trim(),
          homeAddress: input.homeAddress?.trim() || null,
          gymAddress: input.gymAddress.trim(),
          gymAddressDetail: input.gymAddressDetail?.trim() || null,
          businessNo: input.businessNo?.trim() || null,
          sportType: input.sportType?.trim() || null,
          classDescription: input.classDescription?.trim() || null,
          qualifications: input.qualifications?.trim() || null,
          careerSummary: input.careerSummary?.trim() || null,
          memo: input.memo?.trim() || null,
          contactName: input.contactName?.trim() || null,
          contactPhone: input.contactPhone?.trim() || null,
          contactEmail: input.contactEmail?.trim() || null,
          privacyConsent: true,
          registrationConsent: true,
          smsConsent: Boolean(input.smsConsent),
          informationConsent: Boolean(input.informationConsent),
          signatureName: input.signatureName.trim(),
          signatureConsent: true,
          uploadBatchId: input.uploadBatchId?.trim() || null,
        },
        tx,
      );

      await memberGymRepository.createApplicationAttachments(
        attachments.map((a, i) => ({
          applicationId: created.id,
          attachmentType: a.attachmentType,
          storageBucket: bucket,
          storagePath: a.storagePath,
          originalFileName: a.originalFileName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          sortOrder: i,
        })),
        tx,
      );

      await memberGymRepository.createReview(
        {
          applicationId: created.id,
          fromStatus: null,
          toStatus: AssociationMemberGymApplicationStatus.submitted,
          note: "공개 가입 신청 제출",
        },
        tx,
      );

      await memberGymRepository.incrementJoinLinkUsedCount(gate.link.id, tx);
      return created;
    });

    return {
      applicationId: application.id,
      message:
        settings.joinLink.completionMessage ||
        DEFAULT_MEMBER_GYM_SETTINGS.joinLink.completionMessage,
    };
  },

  async listApplications(
    actor: ActorContext,
    filters: {
      status?: AssociationMemberGymApplicationStatus;
      q?: string;
    },
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    return memberGymRepository.listApplications({
      organizerId,
      status: filters.status,
      q: filters.q,
    });
  },

  async getApplication(
    actor: ActorContext,
    applicationId: string,
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const row = await memberGymRepository.findApplicationById(
      organizerId,
      applicationId,
    );
    if (!row) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    return row;
  },

  async searchGymCandidatesForApplication(
    actor: ActorContext,
    applicationId: string,
    organizerIdHint?: string | null,
  ) {
    const app = await this.getApplication(actor, applicationId, organizerIdHint);
    return memberGymRepository.searchGymCandidates({
      businessNo: app.businessNo,
      gymName: app.gymName,
      phone: app.gymPhone || app.phone,
      address: app.gymAddress,
    });
  },

  async transitionApplication(
    actor: ActorContext,
    input: {
      applicationId: string;
      toStatus: AssociationMemberGymApplicationStatus;
      note?: string;
      rejectionReason?: string;
      supplementationNote?: string;
    },
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const app = await memberGymRepository.findApplicationById(
      organizerId,
      input.applicationId,
    );
    if (!app) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    if (app.status === AssociationMemberGymApplicationStatus.approved) {
      throw new AppError("CONFLICT", "이미 승인된 신청입니다.");
    }

    const allowed: AssociationMemberGymApplicationStatus[] = [
      AssociationMemberGymApplicationStatus.under_review,
      AssociationMemberGymApplicationStatus.on_hold,
      AssociationMemberGymApplicationStatus.rejected,
      AssociationMemberGymApplicationStatus.supplementation_requested,
    ];
    if (!allowed.includes(input.toStatus)) {
      throw new AppError("VALIDATION_ERROR", "지원하지 않는 상태 전환입니다.");
    }
    if (
      input.toStatus === AssociationMemberGymApplicationStatus.rejected &&
      !input.rejectionReason?.trim()
    ) {
      throw new AppError("VALIDATION_ERROR", "반려 사유를 입력해 주세요.");
    }
    if (
      input.toStatus ===
        AssociationMemberGymApplicationStatus.supplementation_requested &&
      !input.supplementationNote?.trim()
    ) {
      throw new AppError("VALIDATION_ERROR", "보완 요청 내용을 입력해 주세요.");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await memberGymRepository.updateApplication(
        app.id,
        {
          status: input.toStatus,
          reviewNote: input.note?.trim() || app.reviewNote,
          rejectionReason:
            input.toStatus === AssociationMemberGymApplicationStatus.rejected
              ? input.rejectionReason!.trim()
              : app.rejectionReason,
          supplementationNote:
            input.toStatus ===
            AssociationMemberGymApplicationStatus.supplementation_requested
              ? input.supplementationNote!.trim()
              : app.supplementationNote,
          reviewedAt: new Date(),
        },
        tx,
      );
      await memberGymRepository.createReview(
        {
          applicationId: app.id,
          fromStatus: app.status,
          toStatus: input.toStatus,
          note:
            input.note ||
            input.rejectionReason ||
            input.supplementationNote ||
            null,
          actorUserId: actor.userId,
        },
        tx,
      );
      return updated;
    });
  },

  async approveApplication(
    actor: ActorContext,
    input: {
      applicationId: string;
      mode: "link_existing" | "create_new";
      gymId?: string;
      note?: string;
    },
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const app = await memberGymRepository.findApplicationById(
      organizerId,
      input.applicationId,
    );
    if (!app) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    if (app.status === AssociationMemberGymApplicationStatus.approved) {
      throw new AppError("CONFLICT", "이미 승인된 신청입니다.");
    }
    if (app.memberGym) {
      throw new AppError("CONFLICT", "이미 회원사가 연결된 신청입니다.");
    }

    const settings = parseMemberGymSettings(
      (await memberGymRepository.getOrCreateSettings(organizerId)).settingsJson,
    );

    try {
      return await prisma.$transaction(async (tx) => {
        let gymId: string;
        let gymCreated = false;

        if (input.mode === "link_existing") {
          if (!input.gymId?.trim()) {
            throw new AppError(
              "VALIDATION_ERROR",
              "연결할 체육관을 선택해 주세요.",
            );
          }
          const gym = await gymRepository.findActiveGymById(input.gymId, tx);
          if (!gym) {
            throw new AppError("NOT_FOUND", "선택한 체육관을 찾을 수 없습니다.");
          }
          gymId = gym.id;
        } else {
          const created =
            await gymRepository.findOrCreateGymForOrganizerManualEntry(
              app.gymName,
              tx,
            );
          gymId = created.id;
          gymCreated = created.created;
          await tx.gym.update({
            where: { id: gymId },
            data: {
              phone: app.gymPhone || app.phone || undefined,
              address: app.gymAddress || undefined,
            },
          });
        }

        const existingMember =
          await memberGymRepository.findMemberGymByOrganizerGym(
            organizerId,
            gymId,
            tx,
          );
        if (existingMember) {
          throw new AppError(
            "CONFLICT",
            "이미 해당 협회 회원사로 등록된 체육관입니다. 기존 회원사 상세에서 확인해 주세요.",
            { memberGymId: existingMember.id },
          );
        }

        const next = await memberGymRepository.nextMemberCodeNumber(
          organizerId,
          tx,
        );
        const memberCode = formatMemberCode(
          settings.approval.memberCodePrefix,
          settings.approval.memberCodePadding,
          next,
        );

        const memberGym = await memberGymRepository.createMemberGym(
          {
            organizer: { connect: { id: organizerId } },
            gym: { connect: { id: gymId } },
            application: { connect: { id: app.id } },
            memberCode,
            status: AssociationMemberGymStatus.active,
            approvedAt: new Date(),
            internalNote: input.note?.trim() || null,
          },
          tx,
        );

        await memberGymRepository.updateApplication(
          app.id,
          {
            status: AssociationMemberGymApplicationStatus.approved,
            linkedGym: { connect: { id: gymId } },
            reviewedAt: new Date(),
            reviewNote: input.note?.trim() || app.reviewNote,
          },
          tx,
        );

        await memberGymRepository.createReview(
          {
            applicationId: app.id,
            fromStatus: app.status,
            toStatus: AssociationMemberGymApplicationStatus.approved,
            note: input.note ?? `승인 (gym ${gymCreated ? "신규" : "연결"})`,
            actorUserId: actor.userId,
          },
          tx,
        );

        return { memberGymId: memberGym.id, gymId, gymCreated, memberCode };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (
        isPrismaUniqueViolation(error, "organizerId_gymId") ||
        isPrismaUniqueViolation(error, "organizerId") ||
        isPrismaUniqueViolation(error, "applicationId") ||
        isPrismaUniqueViolation(error)
      ) {
        throw new AppError(
          "CONFLICT",
          "이미 해당 협회 회원사로 등록되었거나 다른 관리자가 먼저 승인했습니다. 기존 회원사 상세에서 확인해 주세요.",
        );
      }
      throw error;
    }
  },

  async listMemberGyms(
    actor: ActorContext,
    filters: { status?: AssociationMemberGymStatus; q?: string },
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    return memberGymRepository.listMemberGyms({
      organizerId,
      status: filters.status,
      q: filters.q,
    });
  },

  async getMemberGym(
    actor: ActorContext,
    memberGymId: string,
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const row = await memberGymRepository.findMemberGymById(
      organizerId,
      memberGymId,
    );
    if (!row) throw new AppError("NOT_FOUND", "회원사를 찾을 수 없습니다.");
    return row;
  },
};
