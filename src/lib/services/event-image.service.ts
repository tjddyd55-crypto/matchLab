import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { eventImageRepository } from "@/lib/repositories/event-image.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import { buildPublicStorageUrlForEventImages } from "@/lib/services/upload.service";

function assertEventScopedPath(eventId: string, path: string): void {
  const prefix = `events/${eventId}/`;
  if (!path.startsWith(prefix)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "이 대회에 속하지 않는 업로드 경로입니다.",
    );
  }
}

export const eventImageService = {
  async finalizePosterUpload(
    actor: ActorContext,
    input: { eventId: string; path: string },
  ): Promise<{ posterUrl: string }> {
    await requireOrganizerForEvent(actor, input.eventId);
    assertEventScopedPath(input.eventId, input.path);
    if (!input.path.includes("/poster/")) {
      throw new AppError(
        "VALIDATION_ERROR",
        "포스터 업로드 경로만 허용됩니다.",
      );
    }
    const posterUrl = buildPublicStorageUrlForEventImages(input.path);
    await eventRepository.updateEvent(input.eventId, { posterUrl });
    return { posterUrl };
  },

  async finalizeGalleryUpload(
    actor: ActorContext,
    input: {
      eventId: string;
      path: string;
      caption?: string | null;
    },
  ): Promise<{ id: string; imageUrl: string }> {
    await requireOrganizerForEvent(actor, input.eventId);
    assertEventScopedPath(input.eventId, input.path);
    if (!input.path.includes("/gallery/")) {
      throw new AppError(
        "VALIDATION_ERROR",
        "갤러리 업로드 경로만 허용됩니다.",
      );
    }
    const imageUrl = buildPublicStorageUrlForEventImages(input.path);
    const maxOrder = await eventImageRepository.maxSortOrder(input.eventId);
    const row = await eventImageRepository.create({
      eventId: input.eventId,
      imageUrl,
      imagePath: input.path,
      caption: input.caption?.trim() || null,
      sortOrder: maxOrder + 1,
    });
    return { id: row.id, imageUrl };
  },

  async deleteGalleryImage(actor: ActorContext, imageId: string): Promise<void> {
    const row = await eventImageRepository.findById(imageId);
    if (!row) throw new AppError("NOT_FOUND", "이미지를 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);
    await eventImageRepository.delete(imageId);
  },

  async updateGalleryCaption(
    actor: ActorContext,
    input: { imageId: string; caption: string | null },
  ): Promise<void> {
    const row = await eventImageRepository.findById(input.imageId);
    if (!row) throw new AppError("NOT_FOUND", "이미지를 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);
    await eventImageRepository.update(input.imageId, {
      caption: input.caption?.trim() || null,
    });
  },
};
