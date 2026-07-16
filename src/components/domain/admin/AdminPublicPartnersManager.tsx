"use client";

import { useState, useTransition } from "react";
import {
  createPublicPartnerAction,
  issuePublicPartnerLogoUploadAction,
  softDeletePublicPartnerAction,
  togglePublicPartnerActiveAction,
  updatePublicPartnerAction,
} from "@/features/public-partners/actions";
import { Button } from "@/components/ui/button";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";

type PartnerRow = {
  id: string;
  name: string;
  type: string;
  logoUrl: string;
  logoPath: string;
  websiteUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function AdminPublicPartnersManager({
  initialRows,
}: {
  initialRows: PartnerRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLogoPath, setEditLogoPath] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  async function onLogoSelected(file: File | null, forId?: string) {
    if (!file) return;
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("로고는 5MB 이하만 업로드할 수 있습니다.");
      return;
    }
    const issued = await issuePublicPartnerLogoUploadAction(file.type, forId);
    if (!issued.ok) {
      setError(issued.error.message);
      return;
    }
    await putFileToEventSignedUploadUrl(issued.data.uploadUrl, file);
    if (forId) {
      setEditLogoPath(issued.data.path);
      setEditLogoUrl(issued.data.publicUrl);
    } else {
      setLogoPath(issued.data.path);
      setLogoUrl(issued.data.publicUrl);
    }
  }

  return (
    <div className="space-y-8">
      <form
        className="grid gap-3 rounded-xl border border-matchon-border bg-white p-4 md:grid-cols-2"
        action={(fd) => {
          fd.set("logoPath", logoPath);
          fd.set("logoUrl", logoUrl);
          startTransition(async () => {
            const res = await createPublicPartnerAction(fd);
            if (!res.ok) setError(res.error.message);
            else {
              setLogoPath("");
              setLogoUrl("");
              window.location.reload();
            }
          });
        }}
      >
        <h2 className="md:col-span-2 text-base font-bold">파트너 로고 등록</h2>
        <label className="flex flex-col gap-1 text-sm">
          이름
          <input name="name" required className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          유형
          <select name="type" className="h-11 rounded-lg border px-3">
            <option value="sponsor">스폰서</option>
            <option value="partner">파트너</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          홈페이지 URL
          <input name="websiteUrl" type="url" className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          대체 텍스트
          <input name="altText" className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          정렬 순서
          <input name="sortOrder" type="number" defaultValue={0} className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          노출 시작일
          <input name="startsAt" type="date" className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          노출 종료일
          <input name="endsAt" type="date" className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input name="isActive" type="checkbox" defaultChecked />
          노출 활성
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          로고 이미지 (PNG/JPEG/WebP, 최대 5MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void onLogoSelected(e.target.files?.[0] ?? null)}
          />
        </label>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="미리보기" className="h-16 w-auto object-contain md:col-span-2" />
        ) : null}
        {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
        <Button type="submit" disabled={pending || !logoPath} className="md:col-span-2">
          등록
        </Button>
      </form>

      <ul className="divide-y rounded-xl border border-matchon-border bg-white">
        {initialRows.map((row) => (
          <li key={row.id} className="space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.logoUrl} alt={row.name} className="h-10 w-16 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-matchon-text-secondary">
                  {row.type} · sort {row.sortOrder} · {row.isActive ? "활성" : "비활성"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(editingId === row.id ? null : row.id);
                  setEditLogoPath("");
                  setEditLogoUrl("");
                }}
              >
                {editingId === row.id ? "닫기" : "수정"}
              </Button>
              <form
                action={(fd) => {
                  startTransition(async () => {
                    await togglePublicPartnerActiveAction(fd);
                    window.location.reload();
                  });
                }}
              >
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="isActive" value={String(row.isActive)} />
                <Button type="submit" size="sm" variant="outline">
                  {row.isActive ? "비활성" : "활성"}
                </Button>
              </form>
              <form
                action={(fd) => {
                  startTransition(async () => {
                    await softDeletePublicPartnerAction(fd);
                    window.location.reload();
                  });
                }}
              >
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" size="sm" variant="destructive">
                  삭제
                </Button>
              </form>
            </div>

            {editingId === row.id ? (
              <form
                className="grid gap-3 rounded-lg border border-matchon-border bg-matchon-surface/50 p-3 md:grid-cols-2"
                action={(fd) => {
                  if (editLogoPath) {
                    fd.set("logoPath", editLogoPath);
                    fd.set("logoUrl", editLogoUrl);
                  }
                  startTransition(async () => {
                    const res = await updatePublicPartnerAction(fd);
                    if (!res.ok) setError(res.error.message);
                    else window.location.reload();
                  });
                }}
              >
                <input type="hidden" name="id" value={row.id} />
                <label className="flex flex-col gap-1 text-sm">
                  이름
                  <input name="name" defaultValue={row.name} required className="h-10 rounded-lg border px-3" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  유형
                  <select name="type" defaultValue={row.type} className="h-10 rounded-lg border px-3">
                    <option value="sponsor">스폰서</option>
                    <option value="partner">파트너</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  홈페이지
                  <input name="websiteUrl" defaultValue={row.websiteUrl ?? ""} className="h-10 rounded-lg border px-3" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  alt
                  <input name="altText" defaultValue={row.altText ?? ""} className="h-10 rounded-lg border px-3" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  sortOrder
                  <input name="sortOrder" type="number" defaultValue={row.sortOrder} className="h-10 rounded-lg border px-3" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  시작일
                  <input name="startsAt" type="date" defaultValue={toDateInput(row.startsAt)} className="h-10 rounded-lg border px-3" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  종료일
                  <input name="endsAt" type="date" defaultValue={toDateInput(row.endsAt)} className="h-10 rounded-lg border px-3" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="isActive" type="checkbox" defaultChecked={row.isActive} />
                  활성
                </label>
                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                  로고 교체
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => void onLogoSelected(e.target.files?.[0] ?? null, row.id)}
                  />
                </label>
                {(editLogoUrl || row.logoUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editLogoUrl || row.logoUrl}
                    alt="미리보기"
                    className="h-14 object-contain md:col-span-2"
                  />
                ) : null}
                <Button type="submit" disabled={pending} className="md:col-span-2">
                  저장
                </Button>
              </form>
            ) : null}
          </li>
        ))}
        {initialRows.length === 0 ? (
          <li className="px-4 py-6 text-sm text-matchon-text-secondary">
            등록된 파트너 로고가 없습니다.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
