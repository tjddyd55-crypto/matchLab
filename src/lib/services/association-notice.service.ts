import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireGymPortalRead } from "@/lib/gym-portal-access";
import {
  requireAssociationOrganizerScope,
} from "@/lib/permissions";
import { associationNoticeRepository } from "@/lib/repositories/association-notice.repository";

function normalizeTitle(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function normalizeContent(raw: string): string {
  return raw.replace(/\r\n/g, "\n").trim();
}

export type GymAssociationNavItem = {
  associationId: string;
  name: string;
};

export const associationNoticeService = {
  /** Sidebar — notices 미포함, id/name만 */
  async listActiveAssociationsForGymNav(
    actor: ActorContext,
  ): Promise<GymAssociationNavItem[]> {
    const access = await requireGymPortalRead(actor);
    const rows = await associationNoticeRepository.listActiveAssociationsForGym(
      access.gymId,
    );
    return rows.map((row) => ({
      associationId: row.organizer.id,
      name: row.organizer.name,
    }));
  },

  async listForAssociation(actor: ActorContext) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    return associationNoticeRepository.listByOrganizerId(organizerId);
  },

  async getForAssociation(actor: ActorContext, noticeId: string) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    const notice = await associationNoticeRepository.findByIdForOrganizer(
      organizerId,
      noticeId,
    );
    if (!notice) {
      throw new AppError("NOT_FOUND", "공지사항을 찾을 수 없습니다.");
    }
    return notice;
  },

  async create(
    actor: ActorContext,
    input: { title: string; content: string; isPinned: boolean },
  ) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    const title = normalizeTitle(input.title);
    const content = normalizeContent(input.content);
    if (!title) {
      throw new AppError("VALIDATION_ERROR", "제목을 입력해 주세요.");
    }
    if (!content) {
      throw new AppError("VALIDATION_ERROR", "내용을 입력해 주세요.");
    }
    if (title.length > 200) {
      throw new AppError("VALIDATION_ERROR", "제목은 200자 이내로 입력해 주세요.");
    }
    if (content.length > 20000) {
      throw new AppError(
        "VALIDATION_ERROR",
        "내용은 20,000자 이내로 입력해 주세요.",
      );
    }
    return associationNoticeRepository.create({
      organizerId,
      title,
      content,
      isPinned: input.isPinned,
      createdByUserId: actor.userId,
    });
  },

  async update(
    actor: ActorContext,
    noticeId: string,
    input: { title: string; content: string; isPinned: boolean },
  ) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    const existing = await associationNoticeRepository.findByIdForOrganizer(
      organizerId,
      noticeId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", "공지사항을 찾을 수 없습니다.");
    }
    const title = normalizeTitle(input.title);
    const content = normalizeContent(input.content);
    if (!title) {
      throw new AppError("VALIDATION_ERROR", "제목을 입력해 주세요.");
    }
    if (!content) {
      throw new AppError("VALIDATION_ERROR", "내용을 입력해 주세요.");
    }
    if (title.length > 200) {
      throw new AppError("VALIDATION_ERROR", "제목은 200자 이내로 입력해 주세요.");
    }
    if (content.length > 20000) {
      throw new AppError(
        "VALIDATION_ERROR",
        "내용은 20,000자 이내로 입력해 주세요.",
      );
    }
    return associationNoticeRepository.update(noticeId, {
      title,
      content,
      isPinned: input.isPinned,
    });
  },

  async delete(actor: ActorContext, noticeId: string) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    const existing = await associationNoticeRepository.findByIdForOrganizer(
      organizerId,
      noticeId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", "공지사항을 찾을 수 없습니다.");
    }
    await associationNoticeRepository.softDelete(noticeId);
  },

  async listForGymAssociation(actor: ActorContext, associationId: string) {
    const access = await requireGymPortalRead(actor);
    const membership = await associationNoticeRepository.findActiveMembership(
      access.gymId,
      associationId,
    );
    if (!membership) {
      throw new AppError(
        "NOT_FOUND",
        "연결된 협회 공지를 찾을 수 없습니다.",
      );
    }
    const notices = await associationNoticeRepository.listByOrganizerId(
      associationId,
    );
    return {
      association: membership.organizer,
      notices,
    };
  },

  async getForGymAssociation(
    actor: ActorContext,
    associationId: string,
    noticeId: string,
  ) {
    const access = await requireGymPortalRead(actor);
    const result = await associationNoticeRepository.findPublishedNoticeForGym({
      gymId: access.gymId,
      organizerId: associationId,
      noticeId,
    });
    if (!result) {
      throw new AppError(
        "NOT_FOUND",
        "연결된 협회 공지를 찾을 수 없습니다.",
      );
    }
    return result;
  },
};
