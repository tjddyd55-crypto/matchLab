"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { EventPosterOrganizerPreview } from "@/components/domain/events/EventPosterOrganizerPreview";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";
import {
  getEventPosterAspectWarning,
  readImageDimensionsFromFile,
  readImageDimensionsFromUrl,
} from "@/lib/client/event-poster-aspect";
import { EVENT_IMAGE_MAX_BYTES } from "@/lib/constants/event-image-upload";
import { EVENT_POSTER_UPLOAD_HINT } from "@/components/domain/events/public/public-event-layout";
import { Button } from "@/components/ui/button";
import {
  finalizeEventPosterUploadAction,
  requestEventPosterUploadAction,
} from "@/features/event-images/actions";

const ALLOWED_POSTER_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function EventPosterUpload({
  eventId,
  posterUrl,
  onPosterUrlChange,
}: {
  eventId: string;
  posterUrl: string | null;
  onPosterUrlChange?: (url: string | null) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);

  const displaySrc = localPreview ?? posterUrl;

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
        localPreviewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!posterUrl || localPreview) return;

    let cancelled = false;
    void readImageDimensionsFromUrl(posterUrl)
      .then(({ width, height }) => {
        if (!cancelled) {
          setAspectWarning(getEventPosterAspectWarning(width, height));
        }
      })
      .catch(() => {
        if (!cancelled) setAspectWarning(null);
      });

    return () => {
      cancelled = true;
    };
  }, [posterUrl, localPreview]);

  function revokeLocalPreview() {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    setLocalPreview(null);
  }

  async function inspectFileAspect(file: File) {
    try {
      const { width, height } = await readImageDimensionsFromFile(file);
      setAspectWarning(getEventPosterAspectWarning(width, height));
    } catch {
      setAspectWarning(null);
    }
  }

  async function uploadFile(file: File) {
    const mimeType = file.type;
    if (!ALLOWED_POSTER_MIME.has(mimeType)) {
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
    await inspectFileAspect(file);

    revokeLocalPreview();
    const blobUrl = URL.createObjectURL(file);
    localPreviewRef.current = blobUrl;
    setLocalPreview(blobUrl);

    startTransition(async () => {
      const issueFd = new FormData();
      issueFd.set("eventId", eventId);
      issueFd.set("mimeType", mimeType);
      const issue = await requestEventPosterUploadAction(issueFd);
      if (!issue.ok) {
        setError(issue.error.message);
        revokeLocalPreview();
        return;
      }

      const put = await putFileToEventSignedUploadUrl(issue.data.uploadUrl, file);
      if (!put.ok) {
        setError(
          `스토리지 업로드에 실패했습니다 (${put.status}). ${put.detail || "다시 시도해 주세요."}`,
        );
        revokeLocalPreview();
        return;
      }

      const finFd = new FormData();
      finFd.set("eventId", eventId);
      finFd.set("path", issue.data.path);
      const fin = await finalizeEventPosterUploadAction(finFd);
      if (!fin.ok) {
        setError(fin.error.message);
        revokeLocalPreview();
        return;
      }

      revokeLocalPreview();
      onPosterUrlChange?.(fin.data.posterUrl);
      router.refresh();
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function clearPoster() {
    revokeLocalPreview();
    setAspectWarning(null);
    onPosterUrlChange?.(null);
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">포스터 이미지</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {EVENT_POSTER_UPLOAD_HINT} (JPEG, PNG, WebP · 최대{" "}
          {Math.round(EVENT_IMAGE_MAX_BYTES / (1024 * 1024))}MB)
        </p>
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start gap-4">
        <EventPosterOrganizerPreview
          src={displaySrc}
          aspectWarning={aspectWarning}
        />
        <div className="flex min-w-[140px] flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "업로드 중…" : displaySrc ? "이미지 교체" : "포스터 업로드"}
          </Button>
          {displaySrc ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={clearPoster}
            >
              이미지 제거
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
