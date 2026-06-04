import "server-only";

import type { GymRegistrationSubmissionListRow } from "@/lib/repositories/registration.repository";
import type { ActorContext } from "@/lib/auth/actor-context";
import { toUtcDateOnly } from "@/lib/date-only";
import { normalizePhoneDigits } from "@/lib/phone";
import {
  DuplicateCheckStatus,
  FighterRegistrationSubmissionStatus,
} from "@/lib/enums";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { inviteLinkRepository } from "@/lib/repositories/invite-link.repository";
import { registrationRepository } from "@/lib/repositories/registration.repository";
import { fighterAccountService } from "@/lib/services/fighter-account.service";
import type { FighterRegistrationWithAccountInput } from "@/lib/validators/fighter-registration.validator";
import {
  inviteLinkService,
  type InviteGateReason,
} from "@/lib/services/invite-link.service";
import {
  maskBirthYearOnly,
  maskPhoneLoosely,
  maskGymPublicLabel,
} from "@/lib/privacy-display";
import { prisma } from "@/lib/prisma";

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
};

export type FighterRegistrationSubmitResult = {
  duplicateSuspected: boolean;
  submissionId: string;
};

function toListItem(
  row: GymRegistrationSubmissionListRow,
): GymRegistrationRequestListItem {
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
    input: FighterRegistrationWithAccountInput,
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
            loginId: input.loginId,
            status: submissionStatus,
            duplicateCheckStatus: dupCheck,
          },
          tx,
        );

      return {
        duplicateSuspected,
        submissionId: created.id,
      };
    });

    await fighterAccountService.createPendingRegistrationAccount({
      loginId: input.loginId,
      password: input.password,
      name: input.name.trim(),
      submissionId: txResult.submissionId,
    });

    return {
      duplicateSuspected: txResult.duplicateSuspected,
      submissionId: txResult.submissionId,
    };
  },

  async listGymRegistrationSubmissions(
    actor: ActorContext,
  ): Promise<GymRegistrationRequestListItem[]> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) return [];
    await requireGymOwner(actor, gymId);

    const rows =
      await registrationRepository.listGymRegistrationSubmissions(gymId);

    return rows.map(toListItem);
  },
};
