import "server-only";

import type { Prisma } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  ConsentStatus,
  DuplicateCheckStatus,
  FighterRegistrationSubmissionStatus,
} from "@/lib/enums";
import { requiresGuardianConsent } from "@/lib/consent-policy";
import { prisma } from "@/lib/prisma";
import { normalizePhoneDigits } from "@/lib/phone";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import { consentRepository } from "@/lib/repositories/consent.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { registrationRepository } from "@/lib/repositories/registration.repository";

export const fighterService = {
  async listGymFighters(actor: ActorContext) {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) return [];
    await requireGymOwner(actor, gymId);
    return fighterRepository.listFightersByGym(gymId);
  },

  /**
   * 트랜잭션 내부 전용. 동시 생성 충돌 시 UNIQUE 재시도·시퀀스 테이블 도입 TODO.
   */
  async generateFighterCode(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    return fighterRepository.generateNextFighterCodeForYear(tx, year);
  },

  async approveRegistrationSubmission(
    actor: ActorContext,
    submissionId: string,
  ): Promise<{ fighterId: string; fighterCode: string }> {
    requireRole(actor, ["gym", "admin"]);

    const submission = await registrationRepository.findSubmissionById(
      submissionId,
    );
    if (!submission) {
      throw new AppError("NOT_FOUND", "등록 요청을 찾을 수 없습니다.");
    }

    await requireGymOwner(actor, submission.gymId);

    if (
      submission.status === FighterRegistrationSubmissionStatus.approved
    ) {
      throw new AppError(
        "CONFLICT",
        "이미 승인 처리된 요청입니다.",
      );
    }
    if (
      submission.status === FighterRegistrationSubmissionStatus.rejected
    ) {
      throw new AppError(
        "CONFLICT",
        "반려된 요청은 승인할 수 없습니다.",
      );
    }

    return prisma.$transaction(async (tx) => {
      const latest = await registrationRepository.findSubmissionById(
        submissionId,
        tx,
      );
      if (!latest) {
        throw new AppError("NOT_FOUND", "등록 요청을 찾을 수 없습니다.");
      }
      if (
        latest.status !== FighterRegistrationSubmissionStatus.submitted &&
        latest.status !== FighterRegistrationSubmissionStatus.duplicate_review
      ) {
        throw new AppError(
          "CONFLICT",
          "처리할 수 없는 상태의 요청입니다.",
        );
      }

      if (requiresGuardianConsent(latest)) {
        const consent =
          await consentRepository.findConsentForRegistrationSubmission(
            submissionId,
            tx,
          );
        if (
          !consent ||
          consent.consentStatus !== ConsentStatus.completed
        ) {
          throw new AppError(
            "FORBIDDEN",
            "보호자 동의가 완료된 후에만 승인할 수 있습니다.",
          );
        }
      }

      const fighterCode = await fighterService.generateFighterCode(tx);

      const fighter = await fighterRepository.createFighterWithGymHistory(tx, {
        fighterCode,
        name: latest.name,
        birthDate: latest.birthDate,
        gender: latest.gender,
        phone: normalizePhoneDigits(latest.phone),
        height: latest.height,
        weight: latest.weight,
        profileImageUrl: latest.profileImageUrl,
        schoolName: latest.schoolName ?? null,
        grade: latest.grade ?? null,
        guardianName: latest.guardianName ?? null,
        guardianPhone: latest.guardianPhone ?? null,
        currentGymId: latest.gymId,
      });

      await consentRepository.attachFighterToSubmissionConsents(
        submissionId,
        fighter.id,
        tx,
      );

      await registrationRepository.updateSubmissionStatus(
        submissionId,
        {
          status: FighterRegistrationSubmissionStatus.approved,
          duplicateCheckStatus: DuplicateCheckStatus.clear,
        },
        tx,
      );

      return {
        fighterId: fighter.id,
        fighterCode: fighter.fighterCode,
      };
    });
  },

  async rejectRegistrationSubmission(
    actor: ActorContext,
    submissionId: string,
  ): Promise<void> {
    requireRole(actor, ["gym", "admin"]);

    const submission = await registrationRepository.findSubmissionById(
      submissionId,
    );
    if (!submission) {
      throw new AppError("NOT_FOUND", "등록 요청을 찾을 수 없습니다.");
    }

    await requireGymOwner(actor, submission.gymId);

    if (
      submission.status === FighterRegistrationSubmissionStatus.approved
    ) {
      throw new AppError("CONFLICT", "이미 승인된 요청입니다.");
    }
    if (
      submission.status === FighterRegistrationSubmissionStatus.rejected
    ) {
      throw new AppError("CONFLICT", "이미 반려된 요청입니다.");
    }

    await registrationRepository.updateSubmissionStatus(submissionId, {
      status: FighterRegistrationSubmissionStatus.rejected,
    });
  },
};
