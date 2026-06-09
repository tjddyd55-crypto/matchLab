import "server-only";

import { randomBytes } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { hashJudgePassword, verifyJudgePassword } from "@/lib/judge-password";
import {
  createJudgeSessionToken,
  readJudgeSession,
  setJudgeSessionCookie,
  clearJudgeSessionCookie,
} from "@/lib/judge-session";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { judgeCredentialRepository } from "@/lib/repositories/judge-credential.repository";
import type {
  CreateJudgeCredentialInput,
  JudgeLoginInput,
} from "@/lib/validators/judge.validator";

export type JudgeCredentialListItemVM = {
  id: string;
  loginId: string;
  displayName: string | null;
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
};

function toListItemVM(
  row: Awaited<ReturnType<typeof judgeCredentialRepository.listByEvent>>[number],
): JudgeCredentialListItemVM {
  return {
    id: row.id,
    loginId: row.loginId,
    displayName: row.displayName,
    memo: row.memo,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
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
    const rows = await judgeCredentialRepository.listByEvent(eventId);
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
        memo: input.memo ?? null,
      });
      return {
        credential: toListItemVM(created),
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

  async login(input: JudgeLoginInput): Promise<ResolvedJudgeSession> {
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

    return {
      credentialId: row.id,
      eventId: row.eventId,
      loginId: row.loginId,
      displayName: row.displayName,
    };
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

    return {
      credentialId: row.id,
      eventId: row.eventId,
      loginId: row.loginId,
      displayName: row.displayName,
    };
  },
};
