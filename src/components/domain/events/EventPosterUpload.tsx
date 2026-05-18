"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { EVENT_IMAGE_MAX_BYTES } from "@/lib/constants/event-image-upload";
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
}: {
  eventId: string;
  posterUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(posterUrl);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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
    startTransition(async () => {
      const issueFd = new FormData();
      issueFd.set("eventId", eventId);
      issueFd.set("mimeType", mimeType);
      const issue = await requestEventPosterUploadAction(issueFd);
      if (!issue.ok) {
        setError(issue.error.message);
        return;
      }

      const putRes = await fetch(issue.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: file,
      });
      if (!putRes.ok) {
        setError("스토리지 업로드에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      const finFd = new FormData();
      finFd.set("eventId", eventId);
      finFd.set("path", issue.data.path);
      const fin = await finalizeEventPosterUploadAction(finFd);
      if (!fin.ok) {
        setError(fin.error.message);
        return;
      }
      setPreview(fin.data.posterUrl);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div className="text-muted-foreground text-xs font-medium">
        포스터 이미지 업로드
      </div>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Supabase 공개 버킷(`event-images`)에 저장됩니다. 보호자 동의 버킷과는
        분리되어 있습니다.
      </p>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start gap-3">
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
          {pending ? "업로드 중…" : "파일 선택"}
        </Button>
        {preview ? (
          <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10">
            <Image
              src={preview}
              alt=""
              fill
              className="object-cover"
              sizes="112px"
              unoptimized
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
