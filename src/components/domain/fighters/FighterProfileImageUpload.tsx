"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";
import {
  PROFILE_IMAGE_ALLOWED_MIME,
  PROFILE_IMAGE_MAX_BYTES,
} from "@/lib/constants/profile-image-upload";
import { Button } from "@/components/ui/button";

const ALLOWED_MIME = new Set<string>(PROFILE_IMAGE_ALLOWED_MIME);

type UploadEnvelope = {
  data?: {
    uploadUrl: string;
    path: string;
    publicUrl: string;
  };
  error?: { message?: string };
};

export function FighterProfileImageUpload({
  fighterId,
  initialImageUrl,
  imageUrl,
  imagePath,
  onImageChange,
}: {
  fighterId: string;
  initialImageUrl: string | null;
  imageUrl: string;
  imagePath: string;
  onImageChange: (next: { url: string; path: string } | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const preview = imageUrl.trim() || initialImageUrl;

  async function uploadFile(file: File) {
    const mimeType = file.type;
    if (!ALLOWED_MIME.has(mimeType)) {
      setError("JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setError(
        `파일 크기는 ${Math.round(PROFILE_IMAGE_MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다.`,
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      const issueRes = await fetch("/api/uploads/profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fighterId, mimeType }),
      });

      const issueJson = (await issueRes.json()) as UploadEnvelope;

      if (
        !issueRes.ok ||
        !issueJson.data?.uploadUrl ||
        !issueJson.data.path ||
        !issueJson.data.publicUrl
      ) {
        setError(
          issueJson.error?.message ??
            `업로드 URL 발급에 실패했습니다 (${issueRes.status}).`,
        );
        return;
      }

      const put = await putFileToEventSignedUploadUrl(
        issueJson.data.uploadUrl,
        file,
      );
      if (!put.ok) {
        setError(
          `스토리지 업로드에 실패했습니다 (${put.status}). ${put.detail || "다시 시도해 주세요."}`,
        );
        return;
      }

      onImageChange({
        url: issueJson.data.publicUrl,
        path: issueJson.data.path,
      });
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function clearImage() {
    setError(null);
    onImageChange(null);
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">프로필 사진</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          JPEG, PNG, WebP · 최대{" "}
          {Math.round(PROFILE_IMAGE_MAX_BYTES / (1024 * 1024))}MB. 저장 시 프로필에
          반영됩니다.
        </p>
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start gap-4">
        {preview ? (
          <div className="relative size-28 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10">
            <Image
              src={preview}
              alt="프로필 미리보기"
              fill
              className="object-cover"
              sizes="112px"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex size-28 shrink-0 items-center justify-center rounded-full border border-dashed bg-muted/30 text-center text-[11px] text-muted-foreground px-2">
            사진 없음
          </div>
        )}
        <div className="flex min-w-[140px] flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={PROFILE_IMAGE_ALLOWED_MIME.join(",")}
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
            {pending
              ? "업로드 중…"
              : preview
                ? "사진 교체"
                : "사진 업로드"}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={clearImage}
            >
              사진 제거
            </Button>
          ) : null}
        </div>
      </div>
      <input type="hidden" name="profileImageUrl" value={imageUrl} />
      <input type="hidden" name="profileImagePath" value={imagePath} />
    </div>
  );
}
