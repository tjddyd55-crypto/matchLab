import "server-only";

import { randomBytes } from "node:crypto";
import type { JudgeCredentialRole } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  formatBirthDateInput,
  judgeDefaultRoute,
  JUDGE_ROLE_LABELS,
  maskBirthDate,
  parseBirthDateInput,
} from "@/lib/judge-identity";
import { hashJudgePassword, verifyJudgePassword } from "@/lib/judge-password";
import { readRequestClientMeta } from "@/lib/judge-request-meta";
import {
  createJudgeSessionToken,
  readJudgeSession,
  setJudgeSessionCookie,
  clearJudgeSessionCookie,
} from "@/lib/judge-session";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { judgeCredentialRepository } from "@/lib/repositories/judge-credential.repository";
import type {
  ConfirmJudgeIdentityInput,
  CreateJudgeCredentialInput,
  JudgeLoginInput,
} from "@/lib/validators/judge.validator";

export type JudgeCredentialListItemVM = {
  id: string;
  loginId: string;
  displayName: string | null;
  role: JudgeCredentialRole;
  roleLabel: string;
  verifiedName: string | null;
  birthDateMasked: string | null;
  identityConfirmed: boolean;
  identityConfirmedAt: string | null;
  assignmentCount: number;
  memo: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type ResolvedJudgeSession = {
  credentialId: string;
  eventId: string;
  loginId: string;
  displayName: string | null;
  role: JudgeCredentialRole;
  roleLabel: string;
  verifiedName: string | null;
  identityConfirmedAt: string | null;
};

function toListItemVM(
  row: Awaited<
    ReturnType<typeof judgeCredentialRepository.listByEventWithAssignmentCounts>
  >[number],
): JudgeCredentialListItemVM {
  const birthIso = row.birthDate ? formatBirthDateInput(row.birthDate) : null;
  return {
    id: row.id,
    loginId: row.loginId,
    displayName: row.displayName,
    role: row.role,
    roleLabel: JUDGE_ROLE_LABELS[row.role],
    verifiedName: row.verifiedName,
    birthDateMasked: maskBirthDate(birthIso),
    identityConfirmed: Boolean(row.identityConfirmedAt),
    identityConfirmedAt: row.identityConfirmedAt?.toISOString() ?? null,
    assignmentCount: row.assignmentCount,
    memo: row.memo,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSessionVM(row: {
  id: string;
  eventId: string;
  loginId: string;
  displayName: string | null;
  role: JudgeCredentialRole;
  verifiedName: string | null;
  identityConfirmedAt: Date | null;
}): ResolvedJudgeSession {
  return {
    credentialId: row.id,
    eventId: row.eventId,
    loginId: row.loginId,
    displayName: row.displayName,
    role: row.role,
    roleLabel: JUDGE_ROLE_LABELS[row.role],
    verifiedName: row.verifiedName,
    identityConfirmedAt: row.identityConfirmedAt?.toISOString() ?? null,
  };
}

export function generateTemporaryJudgePassword(): string {
  return randomBytes(4).toString("hex");
}

export const judgeCredentialService = {
  async listForOrganizer(
    actor: ActorContext,
    eventId: string,
  ): Promise<JudgeCredentialListItemVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const rows =
      await judgeCredentialRepository.listByEventWithAssignmentCounts(eventId);
    return rows.map(toListItemVM);
  },

  async createCredential(
    actor: ActorContext,
    input: CreateJudgeCredentialInput,
  ): Promise<{ credential: JudgeCredentialListItemVM; plainPassword: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const plainPassword = input.password;
    const passwordHash = hashJudgePassword(plainPassword);

    try {
      const created = await judgeCredentialRepository.create({
        eventId: input.eventId,
        loginId: input.loginId,
        passwordHash,
        displayName: input.displayName ?? null,
        role: input.role,
        memo: input.memo ?? null,
      });
      return {
        credential: toListItemVM({ ...created, assignmentCount: 0 }),
        plainPassword,
      };
    } catch {
      throw new AppError(
        "CONFLICT",
        "이미 사용 중인 심판 로그인 ID입니다.",
      );
    }
  },

  async resetPassword(
    actor: ActorContext,
    credentialId: string,
  ): Promise<{ plainPassword: string }> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await judgeCredentialRepository.findById(credentialId);
    if (!row) throw new AppError("NOT_FOUND", "심판 계정을 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);

    const plainPassword = generateTemporaryJudgePassword();
    await judgeCredentialRepository.updatePassword(
      credentialId,
      hashJudgePassword(plainPassword),
    );
    return { plainPassword };
  },

  async setActive(
    actor: ActorContext,
    credentialId: string,
    isActive: boolean,
  ): Promise<void> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await judgeCredentialRepository.findById(credentialId);
    if (!row) throw new AppError("NOT_FOUND", "심판 계정을 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);
    await judgeCredentialRepository.setActive(credentialId, isActive);
  },

  async login(input: JudgeLoginInput): Promise<{ redirectTo: string }> {
    const row = await judgeCredentialRepository.findByLoginId(input.loginId);
    if (!row || !row.isActive) {
      throw new AppError("UNAUTHORIZED", "아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    if (!verifyJudgePassword(input.password, row.passwordHash)) {
      throw new AppError("UNAUTHORIZED", "아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    await judgeCredentialRepository.touchLogin(row.id);
    const token = createJudgeSessionToken({
      credentialId: row.id,
      eventId: row.eventId,
    });
    await setJudgeSessionCookie(token);

    const redirectTo = row.identityConfirmedAt
      ? judgeDefaultRoute(row.role)
      : "/judge/verify";
    return { redirectTo };
  },

  async logout(): Promise<void> {
    await clearJudgeSessionCookie();
  },

  async assertJudgeSession(): Promise<ResolvedJudgeSession> {
    const session = await readJudgeSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "심판 로그인이 필요합니다.");
    }

    const row = await judgeCredentialRepository.findById(session.credentialId);
    if (!row || !row.isActive || row.eventId !== session.eventId) {
      throw new AppError("UNAUTHORIZED", "세션이 만료되었거나 유효하지 않습니다.");
    }

    return toSessionVM(row);
  },

  async getIdentityForm(session: ResolvedJudgeSession): Promise<{
    verifiedName: string;
    birthDate: string;
    phone: string;
    organization: string;
    identityConfirmed: boolean;
  }> {
    const row = await judgeCredentialRepository.findById(session.credentialId);
    if (!row) throw new AppError("NOT_FOUND", "심판 계정을 찾을 수 없습니다.");

    return {
      verifiedName: row.verifiedName ?? row.displayName ?? "",
      birthDate: row.birthDate ? formatBirthDateInput(row.birthDate) : "",
      phone: row.phone ?? "",
      organization: row.organization ?? "",
      identityConfirmed: Boolean(row.identityConfirmedAt),
    };
  },

  async confirmIdentity(
    session: ResolvedJudgeSession,
    input: ConfirmJudgeIdentityInput,
  ): Promise<{ redirectTo: string }> {
    const birthDate = parseBirthDateInput(input.birthDate);
    if (!birthDate) {
      throw new AppError("VALIDATION_ERROR", "생년월일 형식이 올바르지 않습니다.");
    }

    const meta = await readRequestClientMeta();
    await judgeCredentialRepository.confirmIdentity(session.credentialId, {
      verifiedName: input.verifiedName.trim(),
      birthDate,
      phone: input.phone ?? null,
      organization: input.organization ?? null,
      identityConfirmedIp: meta.ip,
      identityConfirmedUserAgent: meta.userAgent,
    });

    const row = await judgeCredentialRepository.findById(session.credentialId);
    if (!row) throw new AppError("NOT_FOUND", "심판 계정을 찾을 수 없습니다.");

    return { redirectTo: judgeDefaultRoute(row.role) };
  },
};
