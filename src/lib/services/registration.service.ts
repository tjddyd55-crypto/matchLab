import "server-only";

import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { toUtcDateOnly } from "@/lib/date-only";
import { normalizePhoneDigits } from "@/lib/phone";
import {
  DuplicateCheckStatus,
  ConsentStatus,
  FighterRegistrationSubmissionStatus,
} from "@/lib/enums";
import { requiresGuardianConsent } from "@/lib/consent-policy";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { inviteLinkRepository } from "@/lib/repositories/invite-link.repository";
import {
  registrationRepository,
  type GymRegistrationSubmissionListRow,
} from "@/lib/repositories/registration.repository";
import type { FighterRegistrationPublicInput } from "@/lib/validators/fighter-registration.validator";
import {
  inviteLinkService,
  type InviteGateReason,
} from "@/lib/services/invite-link.service";
import { consentService } from "@/lib/services/consent.service";
import {
  maskBirthYearOnly,
  maskPhoneLoosely,
  maskGymPublicLabel,
} from "@/lib/privacy-display";

export type RegistrationFormContext =
  | { valid: true; gymDisplayLabel: string }
  | { valid: false; reason: InviteGateReason };

export type GymConsentUiKind =
  | "not_required"
  | "required_no_consent_row"
  | "draft"
  | "completed";

export type GymRegistrationRequestListItem = {
  id: string;
  name: string;
  gender: string;
  birthYearMasked: string;
  phoneMasked: string;
  status: FighterRegistrationSubmissionStatus;
  duplicateCheckStatus: DuplicateCheckStatus;
  submittedAtIso: string;
  duplicateReviewFlow: boolean;
  consentKind: GymConsentUiKind;
  consentLabel: string;
  consentCopyAbsoluteUrl: string | null;
  approvalBlockedByConsent: boolean;
};

export type FighterRegistrationSubmitResult = {
  duplicateSuspected: boolean;
  submissionId: string;
  consentRequired: boolean;
  consentId?: string;
  consentUrl?: string;
};

function consentAffordances(row: GymRegistrationSubmissionListRow): Pick<
  GymRegistrationRequestListItem,
  | "consentKind"
  | "consentLabel"
  | "consentCopyAbsoluteUrl"
  | "approvalBlockedByConsent"
> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  const required = requiresGuardianConsent(row);
  const latest = row.guardianConsents[0];
  const token = row.inviteLink?.token ?? null;

  if (!required) {
    return {
      consentKind: "not_required",
      consentLabel: "동의 불필요",
      consentCopyAbsoluteUrl: null,
      approvalBlockedByConsent: false,
    };
  }

  if (!latest) {
    return {
      consentKind: "required_no_consent_row",
      consentLabel: "동의 필요",
      consentCopyAbsoluteUrl: null,
      approvalBlockedByConsent: true,
    };
  }

  const copyUrl =
    token !== null && token !== ""
      ? `${baseUrl}/guardian-consent/${latest.id}?token=${encodeURIComponent(token)}`
      : null;

  if (latest.consentStatus === ConsentStatus.completed) {
    return {
      consentKind: "completed",
      consentLabel: "동의 완료",
      consentCopyAbsoluteUrl: copyUrl,
      approvalBlockedByConsent: false,
    };
  }

  return {
    consentKind: "draft",
    consentLabel: "동의 작성 중",
    consentCopyAbsoluteUrl: copyUrl,
    approvalBlockedByConsent: true,
  };
}

function toListItem(
  row: GymRegistrationSubmissionListRow,
): GymRegistrationRequestListItem {
  const consent = consentAffordances(row);
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    birthYearMasked: maskBirthYearOnly(row.birthDate),
    phoneMasked: maskPhoneLoosely(row.phone),
    status: row.status,
    duplicateCheckStatus: row.duplicateCheckStatus,
    submittedAtIso: row.submittedAt.toISOString(),
    duplicateReviewFlow:
      row.status === FighterRegistrationSubmissionStatus.duplicate_review ||
      row.duplicateCheckStatus === DuplicateCheckStatus.suspected,
    ...consent,
  };
}

export const registrationService = {
  async getRegistrationFormByToken(
    token: string,
  ): Promise<RegistrationFormContext> {
    const validated = await inviteLinkService.validateInviteToken(token);
    if (!validated.ok) {
      return { valid: false, reason: validated.reason };
    }
    await inviteLinkService.refreshInviteExpiryStatus(validated.link);
    const rechecked = await inviteLinkService.validateInviteToken(token);
    if (!rechecked.ok) {
      return { valid: false, reason: rechecked.reason };
    }

    return {
      valid: true,
      gymDisplayLabel: maskGymPublicLabel(rechecked.link.gym.name),
    };
  },

  async submitFighterRegistrationByToken(
    token: string,
    input: FighterRegistrationPublicInput,
  ): Promise<FighterRegistrationSubmitResult> {
    const normalizedPhone = normalizePhoneDigits(input.phone);
    const birthNorm = toUtcDateOnly(input.birthDate);

    const txResult = await prisma.$transaction(async (tx) => {
      const link = await inviteLinkService.assertInviteAcceptsSubmissionInTx(
        token,
        tx,
      );

      const duplicates = await fighterRepository.findPotentialDuplicateFighters({
        birthDate: birthNorm,
        gender: input.gender,
        phone: normalizedPhone,
      });

      const duplicateSuspected = duplicates.length > 0;
      const submissionStatus = duplicateSuspected
        ? FighterRegistrationSubmissionStatus.duplicate_review
        : FighterRegistrationSubmissionStatus.submitted;
      const dupCheck = duplicateSuspected
        ? DuplicateCheckStatus.suspected
        : DuplicateCheckStatus.clear;

      await inviteLinkRepository.incrementInviteLinkUsage(token, tx);

      const policyInput = {
        birthDate: birthNorm,
        schoolName: input.schoolName ?? null,
        grade: input.grade ?? null,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone?.trim()
          ? normalizePhoneDigits(input.guardianPhone.trim())
          : null,
      };
      const consentRequired = requiresGuardianConsent(policyInput);

      const created =
        await registrationRepository.createFighterRegistrationSubmission(
          {
            gymId: link.gymId,
            inviteLinkId: link.id,
            name: input.name.trim(),
            birthDate: birthNorm,
            gender: input.gender.trim(),
            phone: normalizedPhone,
            height: input.height,
            weight: input.weight,
            profileImageUrl: input.profileImageUrl,
            schoolName: input.schoolName ?? null,
            grade: input.grade ?? null,
            guardianName: input.guardianName ?? null,
            guardianPhone: policyInput.guardianPhone ?? undefined,
            status: submissionStatus,
            duplicateCheckStatus: dupCheck,
          },
          tx,
        );

      const consent = consentRequired
        ? await consentService.ensureConsentDraftForRegistrationSubmission(
            created.id,
            tx,
          )
        : null;

      return {
        duplicateSuspected,
        submissionId: created.id,
        consentId: consent?.id,
        consentRequired,
      };
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    const consentUrl =
      txResult.consentId != null && txResult.consentId !== ""
        ? `${baseUrl}/guardian-consent/${txResult.consentId}?token=${encodeURIComponent(token)}`
        : undefined;

    return {
      duplicateSuspected: txResult.duplicateSuspected,
      submissionId: txResult.submissionId,
      consentRequired: txResult.consentRequired,
      consentId: txResult.consentId,
      consentUrl,
    };
  },

  async listGymRegistrationSubmissions(
    actor: ActorContext,
  ): Promise<GymRegistrationRequestListItem[]> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) return [];
    await requireGymOwner(actor, gymId);

    const rowsInitial =
      await registrationRepository.listGymRegistrationSubmissions(gymId);

    const repairs = await Promise.all(
      rowsInitial.map(async (row) => {
        if (
          requiresGuardianConsent(row) &&
          row.guardianConsents.length === 0
        ) {
          await consentService.ensureConsentDraftForRegistrationSubmission(
            row.id,
          );
          return true;
        }
        return false;
      }),
    );

    const rows = repairs.some(Boolean)
      ? await registrationRepository.listGymRegistrationSubmissions(gymId)
      : rowsInitial;

    return rows.map(toListItem);
  },
};
