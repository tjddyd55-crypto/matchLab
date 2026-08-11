"use client";

import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  createGymAttendanceKioskAction,
  regenerateGymAttendanceKioskTokenAction,
  setGymAttendanceKioskActiveAction,
} from "@/features/gym-attendance/actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatSeoulDateTime } from "@/lib/gym-attendance/seoul-date";

type KioskRow = {
  id: string;
  name: string;
  isActive: boolean;
  lastUsedAt: Date | string | null;
  createdAt: Date | string;
  revokedAt: Date | string | null;
};

function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function GymAttendanceKioskManager({
  initialKiosks,
}: {
  initialKiosks: KioskRow[];
}) {
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [freshLink, setFreshLink] = useState<{
    kioskId: string;
    path: string;
    rawToken: string;
  } | null>(null);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [name, setName] = useState("");

  function runCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createGymAttendanceKioskAction(formData);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setFreshLink(result.data);
      setQrFor(result.data.path);
      setName("");
    });
  }

  function runToggle(kioskId: string, isActive: boolean) {
    setError(null);
    const fd = new FormData();
    fd.set("kioskId", kioskId);
    fd.set("isActive", isActive ? "true" : "false");
    startTransition(async () => {
      const result = await setGymAttendanceKioskActiveAction(fd);
      if (!result.ok) setError(result.error.message);
      else window.location.reload();
    });
  }

  async function runRegenerate(kioskId: string) {
    const ok = await confirm({
      title: "토큰을 재발급하면 기존 출석 링크는 더 이상 사용할 수 없습니다. 계속할까요?",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    const fd = new FormData();
    fd.set("kioskId", kioskId);
    startTransition(async () => {
      const result = await regenerateGymAttendanceKioskTokenAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setFreshLink(result.data);
      setQrFor(result.data.path);
    });
  }

  async function copyLink(path: string) {
    const url = absoluteUrl(path);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setError("링크 복사에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-matchon-border bg-white p-4">
        <h2 className="mb-3 text-sm font-bold">키오스크 생성</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            runCreate(fd);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="예: 정문 태블릿"
            className="w-full flex-1 rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? "생성 중…" : "생성"}
          </Button>
        </form>
        {error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {freshLink ? (
        <section className="rounded-xl border border-matchon-primary/40 bg-matchon-primary/5 p-4">
          <h2 className="text-sm font-bold">출석 링크 (지금만 표시)</h2>
          <p className="mt-1 text-xs text-matchon-text-secondary">
            raw token은 재조회할 수 없습니다. 지금 복사하거나 QR을 저장하세요.
          </p>
          <p className="mt-3 break-all font-mono text-xs">
            {absoluteUrl(freshLink.path)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyLink(freshLink.path)}
            >
              링크 복사
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.open(freshLink.path, "_blank")}
            >
              출석 화면 열기
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setQrFor(freshLink.path)}
            >
              QR 보기
            </Button>
          </div>
          {qrFor === freshLink.path ? (
            <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
              <QRCodeSVG value={absoluteUrl(freshLink.path)} size={180} />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold">키오스크 목록</h2>
        {initialKiosks.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">
            등록된 키오스크가 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {initialKiosks.map((k) => (
              <li
                key={k.id}
                className="rounded-xl border border-matchon-border bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-matchon-text-primary">
                      {k.name}
                    </p>
                    <p className="mt-1 text-xs text-matchon-text-secondary">
                      {k.isActive ? "활성" : "비활성"}
                      {k.lastUsedAt
                        ? ` · 최근 사용 ${formatSeoulDateTime(new Date(k.lastUsedAt))}`
                        : " · 사용 기록 없음"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => void runRegenerate(k.id)}
                    >
                      재발급
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => runToggle(k.id, !k.isActive)}
                    >
                      {k.isActive ? "비활성화" : "활성화"}
                    </Button>
                  </div>
                </div>
                {!k.isActive ? (
                  <p className="mt-2 text-xs text-matchon-text-secondary">
                    비활성 키오스크는 출석 페이지에 접근할 수 없습니다. 재발급
                    후 새 링크를 사용하세요.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
