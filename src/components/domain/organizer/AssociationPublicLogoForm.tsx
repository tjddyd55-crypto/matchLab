"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";
import { formControlFieldClass } from "@/lib/ui/form-control-ui";

type Initial = {
  logoUrl: string | null;
  publicLogoVisible: boolean;
  websiteUrl: string | null;
};

/**
 * 협회 프로필 로고 — 대회/가입 안내용.
 * 메인 하단 파트너 영역과 완전 분리 (자동 노출 없음).
 */
export function AssociationPublicLogoForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState("");
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? "");

  async function onLogoSelected(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("로고는 5MB 이하만 업로드할 수 있습니다.");
      return;
    }
    const issuedRes = await fetch("/api/organizer/public-logo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "issue-upload", mimeType: file.type }),
    });
    const issued = await issuedRes.json().catch(() => null);
    if (!issuedRes.ok || !issued?.data?.uploadUrl) {
      setError(issued?.error?.message ?? "업로드 URL 발급에 실패했습니다.");
      return;
    }
    await putFileToEventSignedUploadUrl(issued.data.uploadUrl, file);
    setLogoPath(issued.data.path);
    setLogoUrl(issued.data.publicUrl);
  }

  return (
    <form
      className="mt-8 space-y-4 rounded-xl border border-matchon-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          setMessage(null);
          const res = await fetch("/api/organizer/public-logo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              op: "save",
              logoPath: logoPath || undefined,
              logoUrl: logoPath ? logoUrl : undefined,
              // 메인 하단 자동 노출 금지 — 필드 유지하되 항상 false
              publicLogoVisible: false,
              websiteUrl: websiteUrl || null,
            }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.data) {
            setError(json?.error?.message ?? "저장에 실패했습니다.");
            return;
          }
          if (json.data.logoUrl) setLogoUrl(json.data.logoUrl);
          setWebsiteUrl(json.data.websiteUrl ?? "");
          setMessage("협회 프로필 로고 설정이 저장되었습니다.");
        });
      }}
    >
      <h2 className="text-base font-bold text-matchon-text-primary">협회 프로필 로고</h2>
      <p className="text-sm text-matchon-text-secondary">
        이 로고는 협회 프로필·체육관 가입 안내에 사용됩니다. 메인 하단 파트너
        영역에는 자동으로 표시되지 않으며, 메인 노출은 플랫폼 관리자가 별도로
        등록합니다. PNG/JPEG/WebP · 최대 5MB.
      </p>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt="협회 프로필 로고 미리보기"
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
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className={formControlFieldClass}
        />
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
