"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";
import { EVENT_IMAGE_MAX_BYTES } from "@/lib/constants/event-image-upload";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import {
  deleteEventGalleryImageAction,
  finalizeEventGalleryUploadAction,
  requestEventGalleryUploadAction,
  updateEventGalleryCaptionAction,
} from "@/features/event-images/actions";

type Row = OrganizerEventDetailVM["galleryImages"][number];

export function EventGalleryManager({
  eventId,
  images,
}: {
  eventId: string;
  images: Row[];
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    const mimeType = file.type;
    if (
      mimeType !== "image/jpeg" &&
      mimeType !== "image/png" &&
      mimeType !== "image/webp"
    ) {
      setError("JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > EVENT_IMAGE_MAX_BYTES) {
      setError(
        `파일 크기는 ${Math.round(EVENT_IMAGE_MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다.`,
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      const issueFd = new FormData();
      issueFd.set("eventId", eventId);
      issueFd.set("mimeType", mimeType);
      const issue = await requestEventGalleryUploadAction(issueFd);
      if (!issue.ok) {
        setError(issue.error.message);
        return;
      }

      const put = await putFileToEventSignedUploadUrl(issue.data.uploadUrl, file);
      if (!put.ok) {
        setError(
          `스토리지 업로드에 실패했습니다 (${put.status}). ${put.detail || "버킷 CORS·공개 정책을 확인해 주세요."}`,
        );
        return;
      }

      const finFd = new FormData();
      finFd.set("eventId", eventId);
      finFd.set("path", issue.data.path);
      const fin = await finalizeEventGalleryUploadAction(finFd);
      if (!fin.ok) {
        setError(fin.error.message);
        return;
      }
      router.refresh();
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  async function remove(imageId: string) {
    const ok = await confirm({
      title: "이 상세 이미지를 삭제할까요?",
      confirmLabel: "삭제",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("imageId", imageId);
      const res = await deleteEventGalleryImageAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  function saveCaption(imageId: string, caption: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("imageId", imageId);
      fd.set("caption", caption);
      const res = await updateEventGalleryCaptionAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">상세 이미지 (갤러리)</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          공개 대회 상세 페이지에 카드 형태로 노출됩니다. 순서는 업로드 순입니다.
        </p>
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPick}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "처리 중…" : "이미지 추가"}
        </Button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((im) => (
          <li
            key={im.id}
            className="flex flex-col gap-2 rounded-lg border bg-muted/10 p-3"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
              <Image
                src={im.imageUrl}
                alt={im.caption ?? ""}
                fill
                className="object-cover"
                sizes="(max-width:768px)100vw,33vw"
                unoptimized
              />
            </div>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">캡션</span>
              <input
                defaultValue={im.caption ?? ""}
                maxLength={500}
                className="border-input bg-background h-8 w-full rounded border px-2"
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  const prev = (im.caption ?? "").trim();
                  if (next === prev) return;
                  saveCaption(im.id, next);
                }}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void remove(im.id)}
            >
              삭제
            </Button>
          </li>
        ))}
      </ul>
      {images.length === 0 ? (
        <p className="text-muted-foreground text-sm">등록된 상세 이미지가 없습니다.</p>
      ) : null}
    </section>
  );
}
