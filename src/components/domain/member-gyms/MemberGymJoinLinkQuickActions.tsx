"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ensureDefaultMemberGymJoinLinkAction,
  prepareMemberGymJoinLinkCopyAction,
} from "@/features/member-gyms/actions";

type CopyLink = {
  id: string;
  label: string;
  url: string;
  expiresAt: Date | string | null;
  usedCount: number;
  maxUses: number | null;
};

export function MemberGymJoinLinkQuickActions({
  showDirectRegister = true,
  showCopy = true,
  showLinkManage = true,
}: {
  showDirectRegister?: boolean;
  showCopy?: boolean;
  showLinkManage?: boolean;
}) {
  const [pending, start] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerLinks, setPickerLinks] = useState<CopyLink[] | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setBanner("가입 링크를 복사했습니다.");
    setError(null);
    setPickerLinks(null);
    setConfirmCreate(false);
  }

  function onCopyClick() {
    start(async () => {
      setError(null);
      setBanner(null);
      const res = await prepareMemberGymJoinLinkCopyAction();
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      if (res.data.kind === "single") {
        await copyUrl(res.data.link.url);
        return;
      }
      if (res.data.kind === "many") {
        setPickerLinks(res.data.links);
        setConfirmCreate(false);
        return;
      }
      setPickerLinks(null);
      setConfirmCreate(true);
    });
  }

  function onConfirmCreate() {
    start(async () => {
      setError(null);
      const res = await ensureDefaultMemberGymJoinLinkAction();
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      await copyUrl(res.data.url);
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
        {showCopy ? (
          <div className="flex w-full flex-col gap-1 sm:w-auto">
            <button
              type="button"
              disabled={pending}
              onClick={onCopyClick}
              className="w-full rounded-md border border-matchon-border bg-white px-3 py-2 text-sm font-semibold text-matchon-text-primary disabled:opacity-60 sm:w-auto"
            >
              가입 링크 복사
            </button>
            {showLinkManage ? (
              <Link
                href="/organizer/member-gyms/links"
                className="text-center text-xs text-matchon-text-secondary underline sm:text-right"
              >
                링크 관리
              </Link>
            ) : null}
          </div>
        ) : null}
        {showDirectRegister ? (
          <Link
            href="/organizer/member-gyms/applications/new"
            className="inline-flex w-full items-center justify-center rounded-md bg-matchon-primary px-3 py-2 text-sm font-semibold text-white sm:w-auto"
          >
            직접 등록
          </Link>
        ) : null}
      </div>

      {banner ? (
        <p
          role="status"
          className="rounded-md bg-matchon-primary-light px-3 py-2 text-xs font-medium text-matchon-primary"
        >
          {banner}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {confirmCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md rounded-md border border-matchon-border bg-white p-4 text-sm shadow-sm"
        >
          <p className="font-semibold text-matchon-text-primary">
            활성화된 가입 링크가 없습니다.
          </p>
          <p className="mt-1 text-matchon-text-secondary">
            기본 가입 링크를 생성하고 복사할까요?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onConfirmCreate}
              className="rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              생성 후 복사
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmCreate(false)}
              className="rounded-md border border-matchon-border px-3 py-1.5 text-xs"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      {pickerLinks ? (
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-lg rounded-md border border-matchon-border bg-white p-4 text-sm shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">복사할 가입 링크 선택</p>
            <button
              type="button"
              className="text-xs text-matchon-text-secondary underline"
              onClick={() => setPickerLinks(null)}
            >
              닫기
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {pickerLinks.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-matchon-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{link.label}</p>
                  <p className="text-xs text-matchon-text-secondary">
                    만료{" "}
                    {link.expiresAt
                      ? format(new Date(link.expiresAt), "yyyy-MM-dd")
                      : "없음"}{" "}
                    · 사용 {link.usedCount}
                    {link.maxUses != null ? ` / ${link.maxUses}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await copyUrl(link.url);
                    })
                  }
                  className="rounded-md border border-matchon-border px-2 py-1 text-xs font-semibold"
                >
                  복사
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
