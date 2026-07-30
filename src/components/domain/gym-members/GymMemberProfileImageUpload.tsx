"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";
import {
  GYM_MEMBER_IMAGE_ALLOWED_MIME,
  GYM_MEMBER_IMAGE_MAX_BYTES,
} from "@/lib/constants/gym-member-image-upload";
import { Button } from "@/components/ui/button";

const ALLOWED_MIME = new Set<string>(GYM_MEMBER_IMAGE_ALLOWED_MIME);
const MAX_MB = Math.round(GYM_MEMBER_IMAGE_MAX_BYTES / (1024 * 1024));

type UploadEnvelope = {
  data?: { uploadUrl: string; path: string };
  error?: { message?: string };
};

/**
 * 회원 프로필 사진 업로드 (private 버킷).
 *
 * public 선수 사진과 다른 점:
 * - 폼이 제출하는 값은 객체 경로(`profileImagePath`)뿐이다. URL은 저장하지 않는다.
 * - 업로드 직후 조회 URL을 만들 수 없으므로 저장 전까지는 로컬 blob으로 미리보기한다.
 * - 초기 미리보기는 서버에서 발급한 signed read URL(`initialImageUrl`)을 쓴다.
 */
export function GymMemberProfileImageUpload({
  memberId,
  initialImageUrl,
  imagePath,
  onImagePathChange,
}: {
  /** 신규 등록 화면에서는 null (서버가 임시 경로를 발급) */
  memberId: string | null;
  initialImageUrl: string | null;
  imagePath: string;
  onImagePathChange: (nextPath: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localUrlRef = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [remoteBroken, setRemoteBroken] = useState(false);
  const [markedRemoved, setMarkedRemoved] = useState(false);

  function revokeLocal() {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
    }
  }

  useEffect(() => () => revokeLocal(), []);

  const remoteUrl =
    !markedRemoved && !remoteBroken ? initialImageUrl?.trim() || null : null;
  const previewUrl = localPreview ?? remoteUrl;

  function validate(file: File): string | null {
    if (!ALLOWED_MIME.has(file.type)) {
      return "JPG, PNG, WebP 이미지만 업로드할 수 있습니다.";
    }
    if (file.size > GYM_MEMBER_IMAGE_MAX_BYTES) {
      return `파일 크기는 ${MAX_MB}MB 이하여야 합니다.`;
    }
    return null;
  }

  function uploadFile(file: File) {
    const invalid = validate(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    revokeLocal();
    const objectUrl = URL.createObjectURL(file);
    localUrlRef.current = objectUrl;
    setLocalPreview(objectUrl);
    setMarkedRemoved(false);

    startTransition(async () => {
      try {
        const issueRes = await fetch("/api/uploads/gym-member-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, mimeType: file.type }),
        });
        const issueJson = (await issueRes.json()) as UploadEnvelope;

        if (!issueRes.ok || !issueJson.data?.uploadUrl || !issueJson.data.path) {
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

        onImagePathChange(issueJson.data.path);
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
    if (file) uploadFile(file);
  }

  function clearImage() {
    setError(null);
    setMarkedRemoved(true);
    setRemoteBroken(false);
    revokeLocal();
    setLocalPreview(null);
    onImagePathChange("");
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">회원 사진</p>
        <p className="mt-1 text-xs leading-relaxed text-matchon-text-secondary">
          권장: 800 × 800px 정사각형 · JPG, PNG, WebP · 최대 {MAX_MB}MB
          <br />
          회원 사진은 체육관 내부에서만 조회할 수 있습니다.
        </p>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {markedRemoved && !imagePath ? (
        <p className="text-xs text-matchon-text-secondary" role="status">
          제거 예정 — 저장하면 사진이 삭제됩니다.
        </p>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        {previewUrl ? (
          <div className="size-32 shrink-0 overflow-hidden rounded-2xl ring-1 ring-matchon-border md:rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob / 만료되는 signed URL */}
            <img
              src={previewUrl}
              alt=""
              className="size-full object-cover"
              onError={() => {
                if (!localPreview) setRemoteBroken(true);
              }}
            />
          </div>
        ) : (
          <div className="flex size-32 shrink-0 items-center justify-center rounded-2xl border border-dashed border-matchon-border bg-matchon-surface/40 px-2 text-center text-[11px] text-matchon-text-secondary md:rounded-full">
            {remoteBroken ? "사진을 불러올 수 없습니다" : "사진 없음"}
          </div>
        )}

        <div className="flex min-w-[140px] flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={GYM_MEMBER_IMAGE_ALLOWED_MIME.join(",")}
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
            {pending ? "업로드 중…" : previewUrl ? "사진 교체" : "사진 선택"}
          </Button>
          {previewUrl || imagePath ? (
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
          <p className="text-[11px] leading-relaxed text-matchon-text-secondary">
            업로드 후 저장 버튼을 눌러 반영하세요.
          </p>
        </div>
      </div>

      <input type="hidden" name="profileImagePath" value={imagePath} />
      <input
        type="hidden"
        name="removeProfileImage"
        value={markedRemoved && !imagePath ? "true" : "false"}
      />
    </div>
  );
}
