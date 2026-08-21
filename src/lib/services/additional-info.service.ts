import "server-only";

import { randomUUID } from "node:crypto";
import { AdditionalInfoStatus, type Prisma } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  additionalInfoBadgeTone as resolveBadgeTone,
  additionalInfoStatusLabel,
  isAdditionalInfoComplete,
  type AdditionalInfoBadgeTone,
} from "@/lib/additional-info/completion";
import {
  buildAdultAdditionalInfoMessage,
  buildMinorAdditionalInfoMessage,
} from "@/lib/additional-info/messages";
import {
  ADDITIONAL_INFO_PRIVACY_CONSENT_CHECKBOX_LABEL,
  ADDITIONAL_INFO_PRIVACY_CONSENT_TEXT,
  ADDITIONAL_INFO_PRIVACY_CONSENT_TITLE,
  buildAdditionalInfoPrivacyConsentSnapshot,
  PRIVACY_CONSENT_SNAPSHOT_KEY,
} from "@/lib/additional-info/privacy-consent";
import {
  resolveAdditionalInfoRecipient,
  resolveAdditionalInfoSendRecipient,
  hasRecipientPhoneDrift,
  digitsOnlyPhone,
} from "@/lib/additional-info/recipient";
import {
  buildAdditionalInfoPublicUrl,
  generateAdditionalInfoRawToken,
  hashAdditionalInfoToken,
} from "@/lib/additional-info/token";
import { formatApplicationDivisionLabel } from "@/lib/applications/application-division-label";
import { encryptInsuranceResidentNumber } from "@/lib/athlete-application/encrypt-insurance-rrn";
import { prisma } from "@/lib/prisma";
import {
  buildInsuranceConsentSnapshot,
  INSURANCE_PII_CONSENT_CHECKBOX_LABEL,
  INSURANCE_PII_CONSENT_TEXT,
  INSURANCE_PII_CONSENT_TITLE,
} from "@/lib/athlete-application/insurance-consent";
import {
  MatchonMessageChannel,
  MatchonMessageOwnerType,
  MatchonMessageSourceType,
} from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import { isMinorBirthDate } from "@/lib/gym-member-self-registration/age";
import { matchonMessagingService } from "@/lib/matchon-messaging";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { applicationRepository } from "@/lib/repositories/application.repository";
import {
  getConsentSignaturesBucketName,
  uploadPrivateObjectBytes,
} from "@/lib/services/upload.service";

function isMinor(birthDate: Date | null | undefined): boolean {
  return birthDate ? isMinorBirthDate(birthDate) : false;
}

function mergeAgreement(existing: unknown, privacy: unknown): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  base[PRIVACY_CONSENT_SNAPSHOT_KEY] = privacy;
  return base as Prisma.InputJsonValue;
}

export type AdditionalInfoRequestResult = {
  applicationId: string;
  ok: boolean;
  skipped?: boolean;
  contactMissing?: boolean;
  code?: string;
  message: string;
  status?: AdditionalInfoStatus;
  dryRun?: boolean;
  maskedPhone?: string | null;
};

export type AdditionalInfoBulkPreview = {
  targetCount: number;
  sendableCount: number;
  contactMissingCount: number;
  alreadyRequestedCount: number;
  completedCount: number;
};

export type PublicAdditionalInfoFormDTO = {
  token: string;
  applicationId: string;
  eventTitle: string;
  fighterName: string;
  gymName: string;
  divisionLabel: string;
  isMinor: boolean;
  guardianName: string | null;
  status: AdditionalInfoStatus;
  alreadyCompleted: boolean;
  privacyConsentTitle: string;
  privacyConsentText: string;
  privacyConsentCheckboxLabel: string;
  insuranceConsentTitle: string;
  insuranceConsentText: string;
  insuranceConsentCheckboxLabel: string;
};

export type SubmitAdditionalInfoPayload = {
  residentRegistrationNumber: string;
  address: string;
  addressDetail?: string | null;
  privacyAgreed: boolean;
  insuranceAgreed: boolean;
  guardianName?: string | null;
  guardianRelation?: string | null;
  signaturePngBase64: string;
};

export const additionalInfoService = {
  mapRowFields(row: {
    additionalInfoStatus: AdditionalInfoStatus;
    additionalInfoCompletedAt: Date | null;
    additionalInfoRecipientPhone?: string | null;
    additionalInfoRecipientMasked?: string | null;
    divisionSelectionType: string;
    fighter: {
      birthDate: Date | null;
      phone: string | null;
      guardianPhone: string | null;
    };
  }) {
    const live = resolveAdditionalInfoRecipient({
      birthDate: row.fighter.birthDate,
      athletePhone: row.fighter.phone,
      guardianPhone: row.fighter.guardianPhone,
    });
    const contactMissing = !live.ok;
    const livePhone = live.ok ? live.phone : null;
    const snapshotPhone = row.additionalInfoRecipientPhone ?? null;
    const drift =
      row.additionalInfoStatus !== "NOT_REQUESTED" &&
      hasRecipientPhoneDrift({
        snapshotPhone,
        livePhone,
      });
    return {
      additionalInfoStatus: row.additionalInfoStatus,
      additionalInfoLabel: additionalInfoStatusLabel(
        row.additionalInfoStatus,
        contactMissing,
      ),
      additionalInfoBadgeTone: resolveBadgeTone(
        row.additionalInfoStatus,
        contactMissing,
      ) as AdditionalInfoBadgeTone,
      additionalInfoCompletedAt: row.additionalInfoCompletedAt
        ? row.additionalInfoCompletedAt.toISOString()
        : null,
      contactMissing,
      additionalInfoContactCode: live.ok ? null : live.code,
      additionalInfoRecipientMasked:
        row.additionalInfoRecipientMasked ??
        (live.ok ? live.maskedPhone : null),
      recipientPhoneDrift: drift,
      liveRecipientMasked: live.ok ? live.maskedPhone : null,
      divisionReviewRequired: row.divisionSelectionType === "OTHER",
    };
  },

  async previewBulk(
    actor: ActorContext,
    eventId: string,
    mode: "adults" | "minors" | "ids",
    applicationIds?: string[],
  ): Promise<AdditionalInfoBulkPreview> {
    await requireOrganizerForEvent(actor, eventId);
    const rows =
      await applicationRepository.listApplicationsForAdditionalInfoBulk(eventId);
    let filtered = rows;
    if (mode === "ids") {
      const ids = new Set(applicationIds ?? []);
      filtered = rows.filter((r) => ids.has(r.id));
    } else if (mode === "adults") {
      filtered = rows.filter((r) => !isMinor(r.fighter.birthDate));
    } else {
      filtered = rows.filter((r) => isMinor(r.fighter.birthDate));
    }

    let sendableCount = 0;
    let contactMissingCount = 0;
    let alreadyRequestedCount = 0;
    let completedCount = 0;
    for (const row of filtered) {
      if (row.additionalInfoStatus === "COMPLETED") {
        completedCount += 1;
        continue;
      }
      if (
        row.additionalInfoStatus === "REQUESTED" ||
        row.additionalInfoStatus === "IN_PROGRESS"
      ) {
        alreadyRequestedCount += 1;
      }
      const recipient = resolveAdditionalInfoRecipient({
        birthDate: row.fighter.birthDate,
        athletePhone: row.fighter.phone,
        guardianPhone: row.fighter.guardianPhone,
      });
      if (!recipient.ok) contactMissingCount += 1;
      else sendableCount += 1;
    }
    return {
      targetCount: filtered.length,
      sendableCount,
      contactMissingCount,
      alreadyRequestedCount,
      completedCount,
    };
  },

  async requestOne(
    actor: ActorContext,
    applicationId: string,
    options?: { resend?: boolean; refreshFromFighter?: boolean },
  ): Promise<AdditionalInfoRequestResult> {
    const row =
      await applicationRepository.findApplicationForAdditionalInfoRequest(
        applicationId,
      );
    if (!row) throw new AppError("NOT_FOUND", "신청 정보를 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);

    if (row.additionalInfoStatus === "COMPLETED") {
      return {
        applicationId,
        ok: false,
        skipped: true,
        message: "이미 추가정보 작성이 완료된 신청입니다.",
        status: row.additionalInfoStatus,
      };
    }

    const isResend =
      Boolean(options?.resend) ||
      row.additionalInfoStatus === "REQUESTED" ||
      row.additionalInfoStatus === "IN_PROGRESS";

    const recipient = resolveAdditionalInfoSendRecipient({
      birthDate: row.fighter.birthDate,
      athletePhone: row.fighter.phone,
      guardianPhone: row.fighter.guardianPhone,
      snapshotPhone: row.additionalInfoRecipientPhone,
      snapshotRecipientType: row.additionalInfoRecipientType,
      resend: isResend,
      refreshFromFighter: options?.refreshFromFighter === true,
    });
    if (!recipient.ok) {
      return {
        applicationId,
        ok: false,
        contactMissing: true,
        code: recipient.code,
        message: recipient.message,
        status: row.additionalInfoStatus,
      };
    }

    const rawToken = generateAdditionalInfoRawToken();
    const tokenHash = hashAdditionalInfoToken(rawToken);
    const linkUrl = buildAdditionalInfoPublicUrl(rawToken);
    const body = recipient.isMinor
      ? buildMinorAdditionalInfoMessage({
          eventTitle: row.event.title,
          fighterName: row.fighter.name,
          linkUrl,
        })
      : buildAdultAdditionalInfoMessage({
          eventTitle: row.event.title,
          fighterName: row.fighter.name,
          linkUrl,
        });

    const created = await matchonMessagingService.createDispatch({
      ownerType: MatchonMessageOwnerType.platform,
      sourceType: MatchonMessageSourceType.system,
      channel: MatchonMessageChannel.kakao_alimtalk,
      title: "추가정보 작성 요청",
      body,
      recipients: [
        {
          phone: recipient.phone,
          name: recipient.isMinor
            ? (row.fighter.guardianName ?? "보호자")
            : row.fighter.name,
          referenceType: "event_application",
          referenceId: row.id,
        },
      ],
      requestedByUserId: actor.userId,
      idempotencyKey: `additional-info:${row.id}:${isResend ? "resend" : "req"}:${tokenHash.slice(0, 12)}`,
      metadata: {
        purpose: "additional_info_request",
        applicationId: row.id,
        eventId: row.eventId,
        recipientMasked: recipient.maskedPhone,
      },
      allowRealSend: false,
    });
    await matchonMessagingService.executeDispatch(created.id, {
      allowRealSend: false,
    });

    const now = new Date();
    const shouldWriteSnapshot =
      !isResend ||
      options?.refreshFromFighter === true ||
      !digitsOnlyPhone(row.additionalInfoRecipientPhone);

    await applicationRepository.patchApplication(row.id, {
      additionalInfoStatus: AdditionalInfoStatus.REQUESTED,
      additionalInfoRequestedAt: row.additionalInfoRequestedAt ?? now,
      additionalInfoLastSentAt: now,
      additionalInfoRecipientType: recipient.recipientType,
      additionalInfoRecipientMasked: recipient.maskedPhone,
      ...(shouldWriteSnapshot
        ? { additionalInfoRecipientPhone: recipient.phone }
        : {}),
      additionalInfoSendStatus: `dry_run:dispatch:${created.id}`,
      additionalInfoTokenHash: tokenHash,
      additionalInfoTokenExpiresAt: null,
    });

    return {
      applicationId,
      ok: true,
      message: isResend
        ? options?.refreshFromFighter
          ? "새 연락처로 변경 후 재전송했습니다. (Development dry-run)"
          : "추가정보 요청을 재전송했습니다. (Development dry-run)"
        : "추가정보 요청을 보냈습니다. (Development dry-run)",
      status: AdditionalInfoStatus.REQUESTED,
      dryRun: true,
      maskedPhone: recipient.maskedPhone,
    };
  },

  async requestBulk(
    actor: ActorContext,
    eventId: string,
    input: { mode: "adults" | "minors" | "ids"; applicationIds?: string[] },
  ) {
    const preview = await this.previewBulk(
      actor,
      eventId,
      input.mode,
      input.applicationIds,
    );
    const rows =
      await applicationRepository.listApplicationsForAdditionalInfoBulk(eventId);
    let targets = rows;
    if (input.mode === "ids") {
      const ids = new Set(input.applicationIds ?? []);
      targets = rows.filter((r) => ids.has(r.id));
    } else if (input.mode === "adults") {
      targets = rows.filter((r) => !isMinor(r.fighter.birthDate));
    } else {
      targets = rows.filter((r) => isMinor(r.fighter.birthDate));
    }

    const results: AdditionalInfoRequestResult[] = [];
    for (const row of targets) {
      if (row.additionalInfoStatus === "COMPLETED") {
        results.push({
          applicationId: row.id,
          ok: false,
          skipped: true,
          message: "이미 완료됨",
          status: row.additionalInfoStatus,
        });
        continue;
      }
      results.push(await this.requestOne(actor, row.id));
    }
    return { preview, results };
  },

  async getPublicForm(rawToken: string): Promise<PublicAdditionalInfoFormDTO> {
    const row =
      await applicationRepository.findApplicationByAdditionalInfoTokenHash(
        hashAdditionalInfoToken(rawToken),
      );
    if (!row) {
      throw new AppError("NOT_FOUND", "유효하지 않거나 만료된 링크입니다.");
    }
    return {
      token: rawToken,
      applicationId: row.id,
      eventTitle: row.event.title,
      fighterName: row.fighter.name,
      gymName: row.gym?.name ?? "—",
      divisionLabel: formatApplicationDivisionLabel({
        division: row.division,
        divisionSelectionType: row.divisionSelectionType,
        requestedDivisionText: row.requestedDivisionText,
      }),
      isMinor: isMinor(row.fighter.birthDate),
      guardianName: row.fighter.guardianName,
      status: row.additionalInfoStatus,
      alreadyCompleted: row.additionalInfoStatus === "COMPLETED",
      privacyConsentTitle: ADDITIONAL_INFO_PRIVACY_CONSENT_TITLE,
      privacyConsentText: ADDITIONAL_INFO_PRIVACY_CONSENT_TEXT,
      privacyConsentCheckboxLabel: ADDITIONAL_INFO_PRIVACY_CONSENT_CHECKBOX_LABEL,
      insuranceConsentTitle: INSURANCE_PII_CONSENT_TITLE,
      insuranceConsentText: INSURANCE_PII_CONSENT_TEXT,
      insuranceConsentCheckboxLabel: INSURANCE_PII_CONSENT_CHECKBOX_LABEL,
    };
  },

  async submitPublicForm(rawToken: string, payload: SubmitAdditionalInfoPayload) {
    const row =
      await applicationRepository.findApplicationByAdditionalInfoTokenHash(
        hashAdditionalInfoToken(rawToken),
      );
    if (!row) {
      throw new AppError("NOT_FOUND", "유효하지 않거나 만료된 링크입니다.");
    }
    if (row.additionalInfoStatus === "COMPLETED") {
      throw new AppError("CONFLICT", "이미 추가정보 작성이 완료되었습니다.");
    }
    if (!payload.privacyAgreed || !payload.insuranceAgreed) {
      throw new AppError("VALIDATION_ERROR", "필수 동의에 체크해 주세요.");
    }
    const address = payload.address.trim();
    if (!address) throw new AppError("VALIDATION_ERROR", "주소를 입력해 주세요.");
    if (!payload.signaturePngBase64?.trim()) {
      throw new AppError("VALIDATION_ERROR", "서명을 입력해 주세요.");
    }
    const minor = isMinor(row.fighter.birthDate);
    const guardianRelation = (payload.guardianRelation ?? "").trim();
    const guardianName =
      (payload.guardianName ?? "").trim() ||
      (row.fighter.guardianName ?? "").trim();
    if (minor && !guardianRelation) {
      throw new AppError("VALIDATION_ERROR", "보호자 관계를 입력해 주세요.");
    }
    if (minor && !guardianName) {
      throw new AppError("VALIDATION_ERROR", "보호자 이름을 입력해 주세요.");
    }

    const encrypted = encryptInsuranceResidentNumber(
      payload.residentRegistrationNumber,
    );
    const now = new Date();
    const privacySnapshot = buildAdditionalInfoPrivacyConsentSnapshot({
      agreedAt: now,
      provenance: minor ? "guardian_self" : "athlete_self",
    });
    const insuranceSnapshot = buildInsuranceConsentSnapshot({
      agreedAt: now,
      provenance: "athlete_self",
    });
    const pngBytes = Buffer.from(
      payload.signaturePngBase64.replace(/^data:image\/png;base64,/, ""),
      "base64",
    );
    if (pngBytes.byteLength === 0 || pngBytes.byteLength > 2 * 1024 * 1024) {
      throw new AppError("VALIDATION_ERROR", "서명 이미지가 올바르지 않습니다.");
    }
    const objectKey = `additional-info/${row.eventId}/${row.id}/${randomUUID()}.png`;
    await uploadPrivateObjectBytes(
      getConsentSignaturesBucketName(),
      objectKey,
      pngBytes,
      "image/png",
    );

    const agreementSnapshot = mergeAgreement(
      row.applicationAgreementSnapshot,
      privacySnapshot,
    );
    const complete = isAdditionalInfoComplete({
      isMinor: minor,
      insuranceRrnCipher: encrypted.cipher,
      insuranceRrnIv: encrypted.iv,
      insuranceRrnAuthTag: encrypted.authTag,
      participantAddress: address,
      insuranceConsentSnapshot: insuranceSnapshot,
      applicationAgreementSnapshot: agreementSnapshot,
      additionalInfoSignatureObjectKey: objectKey,
      guardianName,
      additionalInfoGuardianRelation: guardianRelation || null,
    });
    if (!complete) {
      throw new AppError(
        "VALIDATION_ERROR",
        "필수 추가정보가 모두 입력되지 않았습니다.",
      );
    }

    if (minor && guardianName) {
      await prisma.fighter.update({
        where: { id: row.fighterId },
        data: { guardianName },
      });
    }

    await applicationRepository.patchApplication(row.id, {
      insuranceRrnCipher: Buffer.from(encrypted.cipher),
      insuranceRrnIv: Buffer.from(encrypted.iv),
      insuranceRrnAuthTag: Buffer.from(encrypted.authTag),
      insuranceRrnKeyVer: encrypted.keyVer,
      insuranceRrnMasked: encrypted.masked,
      insuranceConsentSnapshot: insuranceSnapshot as Prisma.InputJsonValue,
      participantAddress: address,
      participantAddressDetail: payload.addressDetail?.trim() || null,
      additionalInfoGuardianRelation: guardianRelation || null,
      additionalInfoSignatureObjectKey: objectKey,
      applicationAgreementSnapshot: agreementSnapshot,
      additionalInfoStatus: AdditionalInfoStatus.COMPLETED,
      additionalInfoCompletedAt: now,
    });

    return { applicationId: row.id, status: AdditionalInfoStatus.COMPLETED };
  },

  async updateApplicantContact(
    actor: ActorContext,
    input: {
      applicationId: string;
      phone?: string | null;
      guardianPhone?: string | null;
    },
  ): Promise<{ applicationId: string; eventId: string }> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await applicationRepository.findApplicationForAdditionalInfo(
      input.applicationId,
    );
    if (!row) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);

    const { validateKrMobile } = await import("@/lib/phone");
    const data: { phone?: string; guardianPhone?: string | null } = {};
    if (input.phone != null) {
      const p = input.phone.trim();
      if (!p) {
        throw new AppError("VALIDATION_ERROR", "선수 연락처를 입력해 주세요.");
      }
      const v = validateKrMobile(p);
      if (!v.ok) throw new AppError("VALIDATION_ERROR", v.message);
      data.phone = v.normalized;
    }
    if (input.guardianPhone !== undefined) {
      const g = (input.guardianPhone ?? "").trim();
      if (!g) {
        data.guardianPhone = null;
      } else {
        const v = validateKrMobile(g);
        if (!v.ok) throw new AppError("VALIDATION_ERROR", v.message);
        data.guardianPhone = v.normalized;
      }
    }
    if (Object.keys(data).length === 0) {
      throw new AppError("VALIDATION_ERROR", "변경할 연락처가 없습니다.");
    }
    await prisma.fighter.update({
      where: { id: row.fighterId },
      data,
    });
    return { applicationId: row.id, eventId: row.eventId };
  },
};
