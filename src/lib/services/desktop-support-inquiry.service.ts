import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  DESKTOP_SUPPORT_INQUIRY_CATEGORIES,
  DESKTOP_SUPPORT_INQUIRY_STATUSES,
  type DesktopSupportInquiryCategoryCode,
  type DesktopSupportInquiryStatusCode,
} from "@/lib/desktop/support-inquiry";
import { AppError } from "@/lib/errors/app-error";
import { AuditAction } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { loginIdSchema } from "@/lib/validators/login-id.validator";

const NAME_MIN = 2;
const NAME_MAX = 50;
const LOGIN_ID_MAX = 100;
const CONTACT_MIN = 3;
const CONTACT_MAX = 150;
const MESSAGE_MIN = 5;
const MESSAGE_MAX = 2000;
const APP_VERSION_MAX = 50;
const ADMIN_NOTE_MAX = 2000;

const ALLOWED_ROLE_HINTS = new Set([
  "desktop_login",
  "desktop_header",
  "web_login",
  "web_password_reset",
  "",
]);

export type CreateDesktopSupportInquiryInput = {
  category: DesktopSupportInquiryCategoryCode;
  name: string;
  loginId?: string | null;
  contact: string;
  message: string;
  appVersion?: string | null;
  roleHint?: string | null;
};

export type DesktopSupportInquiryListItem = {
  id: string;
  category: DesktopSupportInquiryCategoryCode;
  source: "desktop" | "web";
  name: string;
  loginId: string | null;
  contact: string;
  message: string;
  appVersion: string | null;
  roleHint: string | null;
  status: DesktopSupportInquiryStatusCode;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
};

function assertAdmin(actor: ActorContext): void {
  if (actor.role !== "admin") {
    throw new AppError("FORBIDDEN", "관리자만 접근할 수 있습니다.");
  }
}

/** HTML/script 제거 — plain text만 저장 */
function toPlainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-zA-Z0-9#]+;/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRequired(
  value: string,
  label: string,
  min: number,
  max: number,
): string {
  const v = toPlainText(value);
  if (v.length < min) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label}은(는) ${min}자 이상 입력해 주세요.`,
    );
  }
  if (v.length > max) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label}은(는) ${max}자 이하여야 합니다.`,
    );
  }
  return v;
}

function normalizeOptional(
  value: string | null | undefined,
  max: number,
): string | null {
  if (value == null) return null;
  const v = toPlainText(value);
  if (!v) return null;
  if (v.length > max) {
    throw new AppError("VALIDATION_ERROR", `입력값이 너무 깁니다. (${max}자 이하)`);
  }
  return v;
}

function assertNoSecrets(message: string): void {
  const lower = message.toLowerCase();
  if (
    /password\s*[:=]|비밀번호\s*[:=]|passwd\s*[:=]|인증번호|otp\s*[:=]/i.test(
      message,
    ) ||
    /bearer\s+[a-z0-9\-._~+/]+=*/i.test(lower) ||
    /api[_-]?key\s*[:=]/i.test(lower)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "비밀번호·인증번호·토큰 등 민감정보는 문의 내용에 넣지 마세요.",
    );
  }
}

function mapRow(row: {
  id: string;
  category: string;
  source: string;
  name: string;
  loginId: string | null;
  contact: string;
  message: string;
  appVersion: string | null;
  roleHint: string | null;
  status: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}): DesktopSupportInquiryListItem {
  return {
    id: row.id,
    category: row.category as DesktopSupportInquiryCategoryCode,
    source: row.source === "web" ? "web" : "desktop",
    name: row.name,
    loginId: row.loginId,
    contact: row.contact,
    message: row.message,
    appVersion: row.appVersion,
    roleHint: row.roleHint,
    status: row.status as DesktopSupportInquiryStatusCode,
    adminNote: row.adminNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt,
  };
}

export const desktopSupportInquiryService = {
  async createPublic(
    input: CreateDesktopSupportInquiryInput,
  ): Promise<{ id: string }> {
    if (
      !(DESKTOP_SUPPORT_INQUIRY_CATEGORIES as readonly string[]).includes(
        input.category,
      )
    ) {
      throw new AppError("VALIDATION_ERROR", "문의 유형이 올바르지 않습니다.");
    }

    const name = normalizeRequired(input.name, "이름", NAME_MIN, NAME_MAX);
    const contact = normalizeRequired(
      input.contact,
      "연락처",
      CONTACT_MIN,
      CONTACT_MAX,
    );
    const message = normalizeRequired(
      input.message,
      "문의 내용",
      MESSAGE_MIN,
      MESSAGE_MAX,
    );
    assertNoSecrets(message);

    let loginId = normalizeOptional(input.loginId, LOGIN_ID_MAX);
    if (loginId) {
      const parsed = loginIdSchema.safeParse(loginId);
      if (!parsed.success) {
        throw new AppError(
          "VALIDATION_ERROR",
          "로그인 아이디 형식이 올바르지 않습니다.",
        );
      }
      loginId = parsed.data;
    }

    const appVersion = normalizeOptional(input.appVersion, APP_VERSION_MAX);
    const roleHintRaw = normalizeOptional(input.roleHint, 40) ?? "";
    if (!ALLOWED_ROLE_HINTS.has(roleHintRaw)) {
      throw new AppError("VALIDATION_ERROR", "요청 정보가 올바르지 않습니다.");
    }
    const roleHint = roleHintRaw || null;
    const source = roleHintRaw.startsWith("web_") ? "web" : "desktop";

    const created = await prisma.desktopSupportInquiry.create({
      data: {
        category: input.category,
        source,
        name,
        loginId,
        contact,
        message,
        appVersion,
        roleHint,
        status: "open",
      },
      select: { id: true },
    });

    return { id: created.id };
  },

  async listForAdmin(
    actor: ActorContext,
    filters?: {
      status?: DesktopSupportInquiryStatusCode | "all";
      category?: DesktopSupportInquiryCategoryCode | "all";
    },
  ): Promise<DesktopSupportInquiryListItem[]> {
    assertAdmin(actor);

    const status =
      filters?.status && filters.status !== "all" ? filters.status : undefined;
    const category =
      filters?.category && filters.category !== "all"
        ? filters.category
        : undefined;

    const rows = await prisma.desktopSupportInquiry.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return rows.map(mapRow);
  },

  async getForAdmin(
    actor: ActorContext,
    id: string,
  ): Promise<DesktopSupportInquiryListItem> {
    assertAdmin(actor);
    const row = await prisma.desktopSupportInquiry.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) {
      throw new AppError("NOT_FOUND", "문의를 찾을 수 없습니다.");
    }
    return mapRow(row);
  },

  async updateStatus(
    actor: ActorContext,
    input: {
      id: string;
      status: DesktopSupportInquiryStatusCode;
      adminNote?: string | null;
    },
  ): Promise<DesktopSupportInquiryListItem> {
    assertAdmin(actor);

    if (
      !(DESKTOP_SUPPORT_INQUIRY_STATUSES as readonly string[]).includes(
        input.status,
      )
    ) {
      throw new AppError("VALIDATION_ERROR", "상태가 올바르지 않습니다.");
    }

    const existing = await prisma.desktopSupportInquiry.findFirst({
      where: { id: input.id, deletedAt: null },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "문의를 찾을 수 없습니다.");
    }

    const adminNote = normalizeOptional(input.adminNote, ADMIN_NOTE_MAX);
    const isTerminal =
      input.status === "resolved" || input.status === "closed";
    const beforeStatus = existing.status;

    const updated = await prisma.desktopSupportInquiry.update({
      where: { id: input.id },
      data: {
        status: input.status,
        adminNote,
        resolvedAt: isTerminal ? new Date() : null,
        resolvedByUserId: isTerminal ? actor.userId : null,
      },
    });

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.desktop_support_inquiry_status_changed,
      targetType: "DesktopSupportInquiry",
      targetId: updated.id,
      beforeData: { status: beforeStatus },
      afterData: { status: updated.status },
    });

    return mapRow(updated);
  },
};
