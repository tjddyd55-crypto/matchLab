import "server-only";

import type { Prisma } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  DuplicateCheckStatus,
  FighterRegistrationSubmissionStatus,
  FighterStatus,
} from "@/lib/enums";
import { generateTemporaryPassword } from "@/lib/fighter-login";
import { normalizeGymFighterPhone } from "@/lib/gym-fighter-management";
import { fighterAccountService } from "@/lib/services/fighter-account.service";
import { toUtcDateOnly } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { normalizePhoneDigits } from "@/lib/phone";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";
import { consentRepository } from "@/lib/repositories/consent.repository";
import {
  fighterRepository,
  type FighterDuplicateCandidate,
  type GymFighterEditRow,
  type GymFighterListRow,
} from "@/lib/repositories/fighter.repository";
import { fighterAccountRepository } from "@/lib/repositories/fighter-account.repository";
import { registrationRepository } from "@/lib/repositories/registration.repository";
import type {
  GymFighterAccountStatus,
  GymFighterProfileDisplayStatus,
} from "@/lib/gym-fighter-edit-display";
import { userRepository } from "@/lib/repositories/user.repository";
import type {
  GymFighterCreateInput,
  GymFighterUpdateInput,
} from "@/lib/validators/gym-fighter.validator";

export type GymFighterDuplicateConflict = {
  candidates: FighterDuplicateCandidate[];
};

export type GymFighterEditPageViewModel = {
  row: GymFighterEditRow;
  accountStatus: GymFighterAccountStatus;
  profileStatus: GymFighterProfileDisplayStatus;
  loginId: string | null;
  email: string | null;
  publicProfileHref: string | null;
  hasFighterProfile: boolean;
};

export const fighterService = {
  async listGymFighters(actor: ActorContext): Promise<GymFighterListRow[]> {
    const access = await requireGymPortalRead(actor);
    return fighterRepository.listActiveFightersForGymManagement(access.gymId);
  },

  async assertGymCanManageFighter(
    actor: ActorContext,
    fighterId: string,
  ): Promise<{ gymId: string; row: GymFighterEditRow }> {
    requireRole(actor, ["gym", "admin"]);

    if (actor.role === "admin") {
      const ctx = await fighterRepository.findFighterVisibilityContext(fighterId);
      if (!ctx) {
        throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
      }
      const gymId = actor.gymId ?? ctx.currentGymId;
      if (!gymId) {
        throw new AppError(
          "FORBIDDEN",
          "이 선수의 체육관 소속 정보가 없습니다.",
        );
      }
      const edit = await fighterRepository.findFighterEditRowForGym(
        fighterId,
        gymId,
      );
      if (!edit) {
        throw new AppError(
          "FORBIDDEN",
          "이 선수는 현재 체육관 소속이 아닙니다.",
        );
      }
      return { gymId, row: edit };
    }

    const gymId = actor.gymId;
    if (!gymId) {
      throw new AppError(
        "FORBIDDEN",
        "체육관 계정 설정이 필요합니다.",
      );
    }
    await requireGymOwner(actor, gymId);

    const edit = await fighterRepository.findFighterEditRowForGym(
      fighterId,
      gymId,
    );
    if (!edit) {
      throw new AppError(
        "FORBIDDEN",
        "이 선수는 현재 체육관 소속이 아닙니다.",
      );
    }
    return { gymId, row: edit };
  },

  async getGymFighterForEdit(
    actor: ActorContext,
    fighterId: string,
  ): Promise<GymFighterEditRow> {
    const { row } = await fighterService.assertGymCanManageFighter(
      actor,
      fighterId,
    );
    return row;
  },

  async getGymFighterEditPageData(
    actor: ActorContext,
    fighterId: string,
  ): Promise<GymFighterEditPageViewModel> {
    const row = await fighterService.getGymFighterForEdit(actor, fighterId);
    const ctx = await fighterRepository.findFighterVisibilityContext(fighterId);
    if (!ctx) {
      throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    }

    const user = ctx.userId
      ? await userRepository.findUserById(ctx.userId)
      : null;

    const accountStatus: GymFighterAccountStatus = ctx.userId ? "issued" : "none";
    const profileStatus: GymFighterProfileDisplayStatus = !ctx.hasFighterProfile
      ? "missing"
      : ctx.profileIsPublic
        ? "public"
        : "private";

    return {
      row,
      accountStatus,
      profileStatus,
      loginId: user?.loginId ?? null,
      email: user?.email ?? null,
      publicProfileHref:
        ctx.profileIsPublic && ctx.profileSlug
          ? `/fighters/${ctx.profileSlug}`
          : null,
      hasFighterProfile: ctx.hasFighterProfile,
    };
  },

  async createFighterDirectlyForGym(
    actor: ActorContext,
    input: GymFighterCreateInput,
  ): Promise<{
    fighterId: string;
    fighterCode: string;
    linked: boolean;
    loginCredentials?: { loginId: string; temporaryPassword: string };
  }> {
    const portal = await requireGymPortalWrite(actor);
    const gymId = portal.gymId;

    const phone = normalizeGymFighterPhone(input.phone);
    const birthDate = toUtcDateOnly(input.birthDate);

    const duplicates =
      await fighterRepository.findIdentityDuplicateCandidates({
        name: input.name,
        birthDate,
        gender: input.gender,
        phone: phone || undefined,
      });

    if (input.linkFighterId && input.confirmDuplicateLink) {
      const target = duplicates.find((d) => d.id === input.linkFighterId);
      if (!target) {
        throw new AppError(
          "VALIDATION_ERROR",
          "선택한 중복 후보를 확인할 수 없습니다.",
        );
      }
      await prisma.$transaction(async (tx) => {
        await fighterRepository.linkExistingFighterToGym(tx, {
          fighterId: input.linkFighterId!,
          gymId,
          gymInternalMemo: input.gymInternalMemo ?? null,
        });
        await fighterRepository.updateFighterProfile(tx, input.linkFighterId!, {
          name: input.name.trim(),
          birthDate,
          gender: input.gender,
          phone,
          height: input.height ?? null,
          weight: input.weight ?? null,
          primarySport: input.primarySport ?? null,
          guardianName: input.guardianName ?? null,
          guardianPhone: input.guardianPhone ?? null,
          status: FighterStatus.active,
        });
        const history = await fighterRepository.findActiveGymHistory(
          input.linkFighterId!,
          gymId,
        );
        if (history) {
          await fighterRepository.updateGymHistoryMemo(
            tx,
            history.id,
            input.gymInternalMemo ?? null,
          );
        }
      });
      const linked = await fighterRepository.findFighterById(
        input.linkFighterId!,
      );
      const result = {
        fighterId: input.linkFighterId!,
        fighterCode: linked?.fighterCode ?? "",
        linked: true,
      };
      if (input.createLoginAccount && input.loginId) {
        const creds = await fighterService.provisionLoginAfterCreate(
          input.linkFighterId!,
          input,
        );
        return { ...result, loginCredentials: creds };
      }
      return result;
    }

    if (duplicates.length > 0) {
      throw new AppError(
        "CONFLICT",
        "이미 등록된 선수일 수 있습니다. 중복 후보를 확인해 주세요.",
        { candidates: duplicates } satisfies GymFighterDuplicateConflict,
      );
    }

    return prisma.$transaction(async (tx) => {
      let fighter: { id: string; fighterCode: string } | null = null;
      const payload = {
        name: input.name.trim(),
        birthDate,
        gender: input.gender,
        phone,
        height: input.height ?? null,
        weight: input.weight ?? null,
        primarySport: input.primarySport ?? null,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone ?? null,
        gymInternalMemo: input.gymInternalMemo ?? null,
        currentGymId: gymId,
      };

      const maxCodeAttempts = 3;
      for (let attempt = 0; attempt < maxCodeAttempts; attempt++) {
        const fighterCode = await fighterService.generateFighterCode(tx);
        try {
          fighter = await fighterRepository.createFighterWithGymHistory(tx, {
            fighterCode,
            ...payload,
          });
          break;
        } catch (e) {
          if (
            isPrismaUniqueViolation(e, "fighterCode") &&
            attempt < maxCodeAttempts - 1
          ) {
            continue;
          }
          if (isPrismaUniqueViolation(e, "fighterCode")) {
            throw new AppError(
              "CONFLICT",
              "선수 고유번호 생성 중 충돌이 발생했습니다. 다시 시도해 주세요.",
            );
          }
          throw e;
        }
      }

      if (!fighter) {
        throw new AppError(
          "INTERNAL",
          "선수 생성에 실패했습니다. 다시 시도해 주세요.",
        );
      }

      const result = {
        fighterId: fighter.id,
        fighterCode: fighter.fighterCode,
        linked: false,
      };
      if (input.createLoginAccount && input.loginId) {
        const creds = await fighterService.provisionLoginAfterCreate(
          fighter.id,
          input,
        );
        return { ...result, loginCredentials: creds };
      }
      return result;
    });
  },

  async provisionLoginAfterCreate(
    fighterId: string,
    input: Pick<
      GymFighterCreateInput,
      "loginId" | "password" | "autoGeneratePassword"
    >,
  ): Promise<{ loginId: string; temporaryPassword: string }> {
    const loginId = input.loginId!;
    const password =
      input.password?.trim() ||
      (input.autoGeneratePassword ? generateTemporaryPassword() : "");
    if (!password) {
      throw new AppError(
        "VALIDATION_ERROR",
        "초기 비밀번호를 입력하거나 자동 생성을 선택해 주세요.",
      );
    }
    const row = await fighterRepository.findFighterById(fighterId);
    const acc = await fighterAccountService.createFighterLoginAccount({
      loginId,
      password,
      name: row?.name ?? "선수",
      mustChangePassword: true,
    });
    await fighterAccountService.linkFighterToUserAccount(fighterId, acc.userId);
    return { loginId: acc.loginId, temporaryPassword: password };
  },

  async releaseGymFighterAffiliation(
    actor: ActorContext,
    fighterId: string,
  ): Promise<void> {
    await requireGymPortalWrite(actor);
    const { gymId } = await fighterService.assertGymCanManageFighter(
      actor,
      fighterId,
    );
    await prisma.$transaction(async (tx) => {
      await fighterRepository.endActiveGymAffiliation(tx, fighterId, gymId);
    });
  },

  async updateGymFighter(
    actor: ActorContext,
    input: GymFighterUpdateInput,
  ): Promise<void> {
    await requireGymPortalWrite(actor);
    const { row } = await fighterService.assertGymCanManageFighter(
      actor,
      input.fighterId,
    );

    const phone = normalizeGymFighterPhone(input.phone);
    const birthDate = toUtcDateOnly(input.birthDate);

    const duplicates =
      await fighterRepository.findIdentityDuplicateCandidates({
        name: input.name,
        birthDate,
        gender: input.gender,
        phone: phone || undefined,
        excludeFighterId: input.fighterId,
      });
    if (duplicates.length > 0) {
      throw new AppError(
        "CONFLICT",
        "다른 선수와 동일한 정보가 있습니다. 중복 여부를 확인해 주세요.",
        { candidates: duplicates },
      );
    }

    await prisma.$transaction(async (tx) => {
      await fighterRepository.updateFighterProfile(tx, input.fighterId, {
        name: input.name.trim(),
        birthDate,
        gender: input.gender,
        phone,
        height: input.height ?? null,
        weight: input.weight ?? null,
        primarySport: input.primarySport ?? null,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone ?? null,
        status: input.status,
      });

      await fighterRepository.updateGymHistoryMemo(
        tx,
        row.historyId,
        input.gymInternalMemo ?? null,
      );
    });
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

      const phone = normalizePhoneDigits(latest.phone);
      const birthDate = toUtcDateOnly(latest.birthDate);
      const identityDupes =
        await fighterRepository.findIdentityDuplicateCandidates({
          name: latest.name,
          birthDate,
          gender: latest.gender,
          phone,
        });

      let fighter: { id: string; fighterCode: string } | null = null;

      if (identityDupes.length === 1) {
        const existingId = identityDupes[0]!.id;
        const alreadyHere = await fighterRepository.hasActiveAffiliationAtGym(
          existingId,
          latest.gymId,
        );
        if (alreadyHere) {
          throw new AppError(
            "CONFLICT",
            "이미 이 체육관에 등록된 선수입니다.",
          );
        }
        await fighterRepository.linkExistingFighterToGym(tx, {
          fighterId: existingId,
          gymId: latest.gymId,
        });
        await fighterRepository.updateFighterProfile(tx, existingId, {
          name: latest.name,
          birthDate,
          gender: latest.gender,
          phone,
          height: latest.height,
          weight: latest.weight,
          guardianName: latest.guardianName ?? null,
          guardianPhone: latest.guardianPhone ?? null,
          status: FighterStatus.active,
        });
        const linked = await tx.fighter.findUnique({
          where: { id: existingId },
          select: { id: true, fighterCode: true },
        });
        fighter = linked;
      } else if (identityDupes.length > 1) {
        throw new AppError(
          "CONFLICT",
          "동일 정보의 선수가 여러 명 있습니다. 관리자에게 문의해 주세요.",
        );
      } else {
        const fighterPayload = {
          name: latest.name,
          birthDate,
          gender: latest.gender,
          phone,
          height: latest.height,
          weight: latest.weight,
          profileImageUrl: latest.profileImageUrl,
          schoolName: latest.schoolName ?? null,
          grade: latest.grade ?? null,
          guardianName: latest.guardianName ?? null,
          guardianPhone: latest.guardianPhone ?? null,
          currentGymId: latest.gymId,
        };

        const maxCodeAttempts = 3;
        for (let attempt = 0; attempt < maxCodeAttempts; attempt++) {
          const fighterCode = await fighterService.generateFighterCode(tx);
          try {
            fighter = await fighterRepository.createFighterWithGymHistory(tx, {
              fighterCode,
              ...fighterPayload,
            });
            break;
          } catch (e) {
            if (
              isPrismaUniqueViolation(e, "fighterCode") &&
              attempt < maxCodeAttempts - 1
            ) {
              continue;
            }
            if (isPrismaUniqueViolation(e, "fighterCode")) {
              throw new AppError(
                "CONFLICT",
                "선수 고유번호 생성 중 충돌이 발생했습니다. 다시 시도해 주세요.",
              );
            }
            throw e;
          }
        }
      }

      if (!fighter) {
        throw new AppError(
          "INTERNAL",
          "선수 생성에 실패했습니다. 다시 시도해 주세요.",
        );
      }

      if (latest.pendingUserId) {
        await fighterAccountRepository.linkFighterUserId(
          tx,
          fighter.id,
          latest.pendingUserId,
        );
      }

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
    rejectReason?: string,
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

    if (rejectReason?.trim()) {
      console.info(
        `[registration reject] submission=${submissionId} reason=${rejectReason.trim()}`,
      );
    }
  },
};
