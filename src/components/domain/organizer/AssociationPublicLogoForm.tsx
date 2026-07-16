"use client";

import { useState, useTransition } from "react";
import {
  issueOrganizerPublicLogoUploadAction,
  saveOrganizerPublicLogoAction,
} from "@/features/organizer-public-logo/actions";
import { Button } from "@/components/ui/button";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";

type Initial = {
  logoUrl: string | null;
  publicLogoVisible: boolean;
  websiteUrl: string | null;
};

export function AssociationPublicLogoForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState("");
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");

  async function onLogoSelected(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("로고는 5MB 이하만 업로드할 수 있습니다.");
      return;
    }
    const issued = await issueOrganizerPublicLogoUploadAction(file.type);
    if (!issued.ok) {
      setError(issued.error.message);
      return;
    }
    await putFileToEventSignedUploadUrl(issued.data.uploadUrl, file);
    setLogoPath(issued.data.path);
    setLogoUrl(issued.data.publicUrl);
  }

  return (
    <form
      className="mt-8 space-y-4 rounded-xl border border-matchon-border bg-white p-4"
      action={(fd) => {
        if (logoPath) {
          fd.set("logoPath", logoPath);
          fd.set("logoUrl", logoUrl);
        }
        start(async () => {
          setError(null);
          setMessage(null);
          const res = await saveOrganizerPublicLogoAction(fd);
          if (!res.ok) setError(res.error.message);
          else setMessage("공개 로고 설정이 저장되었습니다.");
        });
      }}
    >
      <h2 className="text-base font-bold text-matchon-text-primary">공개 로고</h2>
      <p className="text-sm text-matchon-text-secondary">
        승인된 활성 협회만 공개 홈에 표시됩니다. PNG/JPEG/WebP · 최대 5MB.
      </p>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="협회 공개 로고 미리보기"
          className="h-16 w-auto object-contain"
        />
      ) : (
        <p className="text-sm text-matchon-text-secondary">등록된 로고가 없습니다.</p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        로고 이미지
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => void onLogoSelected(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        홈페이지 URL
        <input
          name="websiteUrl"
          type="url"
          defaultValue={initial.websiteUrl ?? ""}
          className="h-11 rounded-lg border border-matchon-border px-3"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="publicLogoVisible"
          defaultChecked={initial.publicLogoVisible}
        />
        공개 홈에 로고 노출
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-matchon-primary" role="status">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "로고 설정 저장"}
      </Button>
    </form>
  );
}
