"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
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

type PreviewMode =
  | { kind: "none" }
  | { kind: "local"; objectUrl: string }
  | { kind: "remote"; url: string }
  | { kind: "broken"; attemptedUrl: string };

/**
 * 선수 프로필 사진 업로드 UI.
 * - 선택 직후 local blob preview
 * - 업로드 성공 후 remote public URL
 * - 유효하지 않은 src / 빈 문자열 렌더 금지
 * - 실패 시 이전 remote 유지
 */
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
  const localUrlRef = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [markedRemoved, setMarkedRemoved] = useState(false);
  const [remoteBroken, setRemoteBroken] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  function revokeLocal() {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
    }
  }

  useEffect(() => () => revokeLocal(), []);

  const resolvedPreview: PreviewMode = (() => {
    if (localPreview) return { kind: "local", objectUrl: localPreview };
    if (markedRemoved && !imageUrl.trim()) return { kind: "none" };
    const url = imageUrl.trim() || (!markedRemoved ? initialImageUrl?.trim() || "" : "");
    if (!url) return { kind: "none" };
    if (remoteBroken && url === (imageUrl.trim() || initialImageUrl?.trim() || "")) {
      return { kind: "broken", attemptedUrl: url };
    }
    return { kind: "remote", url };
  })();

  async function assertRemoteReadable(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
      if (!res.ok) return false;
      const ct = res.headers.get("content-type") || "";
      return ct.startsWith("image/");
    } catch {
      // CORS 등으로 HEAD/GET 실패해도 객체는 존재할 수 있음 — img onError로 최종 판정
      return true;
    }
  }

  async function uploadFile(file: File) {
    const mimeType = file.type;
    if (!ALLOWED_MIME.has(mimeType)) {
      setError("JPG, PNG, WebP 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setError(
        `파일 크기는 ${Math.round(PROFILE_IMAGE_MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다.`,
      );
      return;
    }

    setError(null);
    revokeLocal();
    const objectUrl = URL.createObjectURL(file);
    localUrlRef.current = objectUrl;
    setLocalPreview(objectUrl);
    setRemoteBroken(false);

    startTransition(async () => {
      try {
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
          revokeLocal();
          setLocalPreview(null);
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
          revokeLocal();
          setLocalPreview(null);
          return;
        }

        const readable = await assertRemoteReadable(issueJson.data.publicUrl);
        if (!readable) {
          setError(
            "업로드는 됐지만 사진을 읽을 수 없습니다. Storage 버킷(profile-images) 설정을 확인해 주세요.",
          );
          revokeLocal();
          setLocalPreview(null);
          return;
        }

        setMarkedRemoved(false);
        onImageChange({
          url: issueJson.data.publicUrl,
          path: issueJson.data.path,
        });
        revokeLocal();
        setLocalPreview(null);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "업로드 중 오류가 발생했습니다. 다시 시도해 주세요.",
        );
        revokeLocal();
        setLocalPreview(null);
      }
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function clearImage() {
    setError(null);
    setMarkedRemoved(true);
    setRemoteBroken(false);
    revokeLocal();
    setLocalPreview(null);
    onImageChange(null);
  }

  const showActions = resolvedPreview.kind !== "none" || pending;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">프로필 사진</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          권장: 800 × 800px 정사각형 이미지
          <br />
          JPG, PNG, WebP · 최대{" "}
          {Math.round(PROFILE_IMAGE_MAX_BYTES / (1024 * 1024))}MB
        </p>
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      {markedRemoved && !imageUrl.trim() ? (
        <p className="text-muted-foreground text-xs" role="status">
          제거 예정 — 저장하면 프로필 사진이 삭제됩니다.
        </p>
      ) : null}
      <div className="flex flex-wrap items-start gap-4">
        {resolvedPreview.kind === "local" || resolvedPreview.kind === "remote" ? (
          <div className="relative size-32 shrink-0 overflow-hidden rounded-2xl ring-1 ring-foreground/10 md:rounded-full">
            <Image
              src={
                resolvedPreview.kind === "local"
                  ? resolvedPreview.objectUrl
                  : resolvedPreview.url
              }
              alt=""
              fill
              className="object-cover"
              sizes="128px"
              unoptimized
              onError={() => {
                if (resolvedPreview.kind === "remote") {
                  setRemoteBroken(true);
                }
              }}
            />
          </div>
        ) : resolvedPreview.kind === "broken" ? (
          <div className="flex size-32 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-2 text-center text-[11px] text-destructive md:rounded-full">
            <span>사진을 불러올 수 없습니다</span>
            <span className="text-[10px] text-muted-foreground">다시 업로드해 주세요</span>
          </div>
        ) : (
          <div className="flex size-32 shrink-0 items-center justify-center rounded-2xl border border-dashed bg-muted/30 text-center text-[11px] text-muted-foreground px-2 md:rounded-full">
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
              : showActions && resolvedPreview.kind !== "none"
                ? "사진 교체"
                : "사진 선택"}
          </Button>
          {resolvedPreview.kind !== "none" || (markedRemoved && !imageUrl.trim()) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || (markedRemoved && !imageUrl.trim() && !localPreview)}
              onClick={clearImage}
            >
              사진 제거
            </Button>
          ) : null}
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            업로드 후 저장 버튼을 눌러 반영하세요.
          </p>
        </div>
      </div>
      <input type="hidden" name="profileImageUrl" value={imageUrl} />
      <input type="hidden" name="profileImagePath" value={imagePath} />
    </div>
  );
}
