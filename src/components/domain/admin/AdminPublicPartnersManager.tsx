"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createPublicPartnerAction,
  issuePublicPartnerLogoUploadAction,
  movePublicPartnerSortAction,
  softDeletePublicPartnerAction,
  togglePublicPartnerActiveAction,
  updatePublicPartnerAction,
} from "@/features/public-partners/actions";
import { PublicPartnerLogoGrid } from "@/components/domain/events/public/PublicPartnerLogoGrid";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";
import {
  PUBLIC_PARTNER_EXPOSURE_STATUS_LABELS,
  PUBLIC_PARTNER_TYPE_LABELS,
  PUBLIC_PARTNER_TYPE_VALUES,
  type PublicPartnerExposureStatus,
} from "@/lib/public-partner-logo";
import type { PublicPartnerType } from "@/lib/enums";
import { toDateInputValue } from "@/lib/date-only";

type PartnerRow = {
  id: string;
  name: string;
  type: PublicPartnerType;
  logoUrl: string;
  logoPath: string;
  websiteUrl: string | null;
  altText: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  startsAt: string | null;
  endsAt: string | null;
  exposureStatus: PublicPartnerExposureStatus;
};

function TypeOptions() {
  return (
    <>
      {PUBLIC_PARTNER_TYPE_VALUES.map((t) => (
        <option key={t} value={t}>
          {PUBLIC_PARTNER_TYPE_LABELS[t]}
        </option>
      ))}
    </>
  );
}

export function AdminPublicPartnersManager({
  initialRows,
}: {
  initialRows: PartnerRow[];
}) {
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLogoPath, setEditLogoPath] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  const stats = useMemo(() => {
    const counts = {
      all: initialRows.length,
      active: 0,
      inactive: 0,
      scheduled: 0,
      ended: 0,
    };
    for (const row of initialRows) {
      counts[row.exposureStatus] += 1;
    }
    return counts;
  }, [initialRows]);

  const previewPartners = useMemo(
    () =>
      initialRows.map((r) => ({
        id: r.id,
        name: r.name,
        logoUrl: r.logoUrl,
        websiteUrl: r.websiteUrl,
        altText: r.altText?.trim() || `${r.name} 로고`,
        openInNewTab: r.openInNewTab,
      })),
    [initialRows],
  );
  const mutedIds = useMemo(
    () =>
      new Set(
        initialRows
          .filter((r) => r.exposureStatus !== "active")
          .map((r) => r.id),
      ),
    [initialRows],
  );

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

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      setError(null);
      try {
        await action();
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["전체", stats.all],
            ["노출 중", stats.active],
            ["비활성", stats.inactive],
            ["노출 예정", stats.scheduled],
            ["노출 종료", stats.ended],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-matchon-border bg-matchon-primary-light/30 px-3 py-2"
          >
            <p className="text-xs text-matchon-text-secondary">{label}</p>
            <p className="text-lg font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3 rounded-xl border border-matchon-border bg-matchon-sidebar p-4">
        <h2 className="text-sm font-bold text-white">메인 하단 미리보기</h2>
        <p className="text-xs text-white/60">
          흐리게 표시된 항목은 현재 공개 메인에 노출되지 않습니다.
        </p>
        {previewPartners.length === 0 ? (
          <p className="text-sm text-white/55">등록된 파트너 로고가 없습니다.</p>
        ) : (
          <PublicPartnerLogoGrid
            partners={previewPartners}
            mutedIds={mutedIds}
          />
        )}
      </section>

      <form
        className="grid gap-3 rounded-xl border border-matchon-border bg-white p-4 md:grid-cols-2"
        action={(fd) => {
          fd.set("logoPath", logoPath);
          fd.set("logoUrl", logoUrl);
          run(async () => {
            const res = await createPublicPartnerAction(fd);
            if (!res.ok) throw new Error(res.error.message);
            setLogoPath("");
            setLogoUrl("");
          });
        }}
      >
        <h2 className="md:col-span-2 text-base font-bold">파트너 로고 등록</h2>
        <label className="flex flex-col gap-1 text-sm">
          이름
          <input name="name" required className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          분류
          <select name="type" defaultValue="partner" className="h-11 rounded-lg border px-3">
            <TypeOptions />
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
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          설명
          <input name="description" className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          정렬 순서
          <input name="sortOrder" type="number" min={0} defaultValue={0} className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          노출 시작일
          <input name="startsAt" type="date" className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          노출 종료일
          <input name="endsAt" type="date" className="h-11 rounded-lg border px-3" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked />
          노출 활성
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="openInNewTab" type="checkbox" defaultChecked />
          새 창으로 열기
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
                  {PUBLIC_PARTNER_TYPE_LABELS[row.type]} · sort {row.sortOrder} ·{" "}
                  {PUBLIC_PARTNER_EXPOSURE_STATUS_LABELS[row.exposureStatus]}
                </p>
              </div>
              <form
                action={(fd) => {
                  run(async () => {
                    await movePublicPartnerSortAction(fd);
                  });
                }}
              >
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="up" />
                <Button type="submit" size="sm" variant="outline" disabled={pending}>
                  ↑
                </Button>
              </form>
              <form
                action={(fd) => {
                  run(async () => {
                    await movePublicPartnerSortAction(fd);
                  });
                }}
              >
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="down" />
                <Button type="submit" size="sm" variant="outline" disabled={pending}>
                  ↓
                </Button>
              </form>
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
                  run(async () => {
                    await togglePublicPartnerActiveAction(fd);
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
                action={async (fd) => {
                  const ok = await confirm({
                    title: "파트너 로고를 삭제할까요?",
                    description:
                      "메인 페이지에서 더 이상 표시되지 않습니다.\n기존 업로드 파일은 사용 여부를 확인한 뒤 정리됩니다.",
                    variant: "danger",
                  });
                  if (!ok) return;
                  run(async () => {
                    await softDeletePublicPartnerAction(fd);
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
                  run(async () => {
                    const res = await updatePublicPartnerAction(fd);
                    if (!res.ok) throw new Error(res.error.message);
                  });
                }}
              >
                <input type="hidden" name="id" value={row.id} />
                <label className="flex flex-col gap-1 text-sm">
                  이름
                  <input name="name" defaultValue={row.name} required className="h-10 rounded-lg border px-3" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  분류
                  <select name="type" defaultValue={row.type} className="h-10 rounded-lg border px-3">
            <TypeOptions />
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
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          설명
          <input name="description" defaultValue={row.description ?? ""} className="h-10 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          sortOrder
          <input name="sortOrder" type="number" min={0} defaultValue={row.sortOrder} className="h-10 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          시작일
          <input
            name="startsAt"
            type="date"
            defaultValue={toDateInputValue(row.startsAt)}
            className="h-10 rounded-lg border px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          종료일
          <input
            name="endsAt"
            type="date"
            defaultValue={toDateInputValue(row.endsAt)}
            className="h-10 rounded-lg border px-3"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked={row.isActive} />
          활성
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="openInNewTab" type="checkbox" defaultChecked={row.openInNewTab} />
          새 창으로 열기
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
            등록된 파트너 로고가 없습니다. 첫 파트너 로고를 등록해 주세요.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
