import "server-only";

import { randomBytes } from "node:crypto";

import type { ActorContext } from "@/lib/auth/actor-context";
import { STAFF_RECORDER_UNLOCK_COOKIE } from "@/lib/constants/staff-recorder-access";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  eventStaffAccessRepository,
  type StaffAccessLinkRow,
} from "@/lib/repositories/event-staff-access.repository";
import { cookies } from "next/headers";

export const RESULT_RECORDER_ROLE = "result_recorder";

export type ResolvedStaffRecorderLink = StaffAccessLinkRow & {
  eventTitle: string;
  publicSlug: string;
};

export type EventStaffLinkListItemVM = {
  id: string;
  label: string;
  role: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  canChangeMatchStatus: boolean;
  canRecordOutcomeDraft: boolean;
  canConfirmResult: boolean;
  hasAccessCode: boolean;
  /** 주최자 인증 화면 전용 — 외부에 노출하지 말 것 */
  token: string;
  tokenPreviewSuffix: string;
};

export type StaffRecorderPageContext =
  | { kind: "invalid" }
  | { kind: "locked"; eventTitle: string }
  | { kind: "ready"; link: ResolvedStaffRecorderLink };

async function resolveStaffRecorderPage(
  token: string,
): Promise<StaffRecorderPageContext> {
  const raw = token.trim();
  if (!raw) return { kind: "invalid" };

  const row = await eventStaffAccessRepository.findByToken(raw);
  if (!row || row.revokedAt) return { kind: "invalid" };

  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return { kind: "invalid" };
  }

  if (row.role !== RESULT_RECORDER_ROLE) return { kind: "invalid" };

  const ev = await prisma.event.findUnique({
    where: { id: row.eventId },
    select: { title: true, publicSlug: true },
  });
  if (!ev) return { kind: "invalid" };

  const link: ResolvedStaffRecorderLink = {
    ...row,
    eventTitle: ev.title,
    publicSlug: ev.publicSlug,
  };

  if (row.accessCode) {
    const cookieStore = await cookies();
    const cookieTok = cookieStore.get(STAFF_RECORDER_UNLOCK_COOKIE)?.value;
    if (cookieTok !== raw) {
      return { kind: "locked", eventTitle: ev.title };
    }
  }

  return { kind: "ready", link };
}

export const eventStaffAccessService = {
  resolveStaffRecorderPage,

  async assertRecorderLink(token: string): Promise<ResolvedStaffRecorderLink> {
    const ctx = await resolveStaffRecorderPage(token);
    if (ctx.kind === "invalid") {
      throw new AppError(
        "UNAUTHORIZED",
        "유효하지 않거나 폐기된 결과 입력 링크입니다.",
      );
    }
    if (ctx.kind === "locked") {
      throw new AppError(
        "FORBIDDEN",
        "접속 코드를 입력한 뒤 다시 시도해 주세요.",
      );
    }
    return ctx.link;
  },

  /**
   * 접속 코드가 설정된 링크에서, 코드 검증 후 브라우저 잠금 해제 쿠키를 설정한다.
   */
  async unlockRecorderWithAccessCode(
    token: string,
    accessCode: string,
  ): Promise<void> {
    const raw = token.trim();
    if (!raw) {
      throw new AppError("VALIDATION_ERROR", "링크 정보가 없습니다.");
    }

    const row = await eventStaffAccessRepository.findByToken(raw);
    if (!row || row.revokedAt) {
      throw new AppError("UNAUTHORIZED", "유효하지 않은 링크입니다.");
    }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      throw new AppError("UNAUTHORIZED", "만료된 링크입니다.");
    }
    if (row.role !== RESULT_RECORDER_ROLE) {
      throw new AppError("FORBIDDEN", "이 링크는 결과 입력용이 아닙니다.");
    }

    const expected = row.accessCode?.trim() ?? "";
    if (!expected) {
      return;
    }

    const got = accessCode.trim();
    if (!got) {
      throw new AppError("VALIDATION_ERROR", "접속 코드를 입력해 주세요.");
    }
    if (expected !== got) {
      throw new AppError("VALIDATION_ERROR", "접속 코드가 일치하지 않습니다.");
    }

    const cookieStore = await cookies();
    cookieStore.set(STAFF_RECORDER_UNLOCK_COOKIE, raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  },

  async listLinksForOrganizer(
    actor: ActorContext,
    eventId: string,
  ): Promise<EventStaffLinkListItemVM[]> {
    await requireOrganizerForEvent(actor, eventId);
    const rows = await eventStaffAccessRepository.listByEvent(eventId);
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      role: r.role,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      canChangeMatchStatus: r.canChangeMatchStatus,
      canRecordOutcomeDraft: r.canRecordOutcomeDraft,
      canConfirmResult: r.canConfirmResult,
      hasAccessCode: Boolean(r.accessCode?.trim()),
      token: r.token,
      tokenPreviewSuffix: r.token.slice(-6),
    }));
  },

  async createRecorderLink(
    actor: ActorContext,
    input: {
      eventId: string;
      label: string;
      expiresAt: Date | null;
      accessCode?: string | null;
      canChangeMatchStatus: boolean;
      canRecordOutcomeDraft: boolean;
      canConfirmResult: boolean;
    },
  ): Promise<{ token: string; urlPath: string }> {
    await requireOrganizerForEvent(actor, input.eventId);
    requireRole(actor, ["organizer", "admin"]);

    const token = randomBytes(24).toString("hex");

    await eventStaffAccessRepository.create({
      eventId: input.eventId,
      token,
      label: input.label,
      accessCode: input.accessCode ?? null,
      role: RESULT_RECORDER_ROLE,
      canChangeMatchStatus: input.canChangeMatchStatus,
      canRecordOutcomeDraft: input.canRecordOutcomeDraft,
      canConfirmResult: input.canConfirmResult,
      expiresAt: input.expiresAt,
    });

    return {
      token,
      urlPath: `/staff/result/${token}/matches`,
    };
  },

  async revokeLink(actor: ActorContext, linkId: string): Promise<void> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await eventStaffAccessRepository.findById(linkId);
    if (!row) throw new AppError("NOT_FOUND", "링크를 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);
    await eventStaffAccessRepository.revoke(linkId);
  },
};
