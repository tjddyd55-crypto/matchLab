"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelMemberGymOwnerInviteAction,
  connectMemberGymOwnerAction,
  disconnectMemberGymOwnerAction,
  inviteMemberGymOwnerAction,
  searchMemberGymOwnerUsersAction,
  setMemberGymOwnerAccessSuspendedAction,
} from "@/features/gym-owner-account/actions";
import { MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL } from "@/lib/ui-labels/member-gym-owner";
import type { MemberGymOwnerAccountStatus } from "@/lib/member-gym/owner-account";
import { formatPhoneDisplay, formatPhoneNumber } from "@/lib/phone";
import { PhoneInput } from "@/components/shared/PhoneInput";

type OwnerView = {
  status: MemberGymOwnerAccountStatus;
  owner: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    loginId: string | null;
    role: string;
    authUserId: string | null;
  };
  inviteEmail: string | null;
  inviteExpiresAt: Date | string | null;
  canLogin: boolean;
  isPlaceholder: boolean;
  displayName: string;
  displayEmail: string;
  displayPhone: string;
  roleLabel: string;
  inviteDefaults: { name: string; email: string; phone: string };
};

type SearchHit = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  canConnect: boolean;
  blockReason: string | null;
};

export function MemberGymAccountSection({
  memberGymId,
  gymName,
  account,
}: {
  memberGymId: string;
  gymName: string;
  account: OwnerView;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmConnect, setConfirmConnect] = useState<SearchHit | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);

  function refreshMsg(ok: string) {
    setMessage(ok);
    setError(null);
    router.refresh();
  }

  const phoneLabel = formatPhoneDisplay(
    account.displayPhone === "미등록" ? "" : account.displayPhone,
  );

  return (
    <section className="space-y-3 rounded-md border border-matchon-border bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-bold">회원사 로그인 계정</h2>
        <span className="rounded bg-matchon-surface px-2 py-0.5 text-xs font-semibold text-matchon-primary">
          {MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL[account.status]}
        </span>
      </div>

      <dl className="grid gap-1 text-sm text-matchon-text-secondary">
        <div>
          이름:{" "}
          <span className="text-matchon-text-primary">{account.displayName}</span>
        </div>
        <div>이메일: {account.displayEmail}</div>
        <div>휴대전화: {phoneLabel}</div>
        <div>역할: {account.roleLabel}</div>
        <div>로그인 가능: {account.canLogin ? "예" : "아니요"}</div>
        <div>
          계정 상태: {MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL[account.status]}
        </div>
        {account.isPlaceholder ? (
          <div>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
              임시 계정
            </span>
          </div>
        ) : null}
        {account.inviteExpiresAt ? (
          <div>
            초대 만료:{" "}
            {new Date(account.inviteExpiresAt).toLocaleString("ko-KR")}
          </div>
        ) : null}
      </dl>

      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-md border border-matchon-border px-3 py-2 text-xs font-semibold sm:w-auto"
          onClick={() => {
            setConnectOpen(true);
            setInviteOpen(false);
          }}
        >
          기존 계정 연결
        </button>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-md border border-matchon-border px-3 py-2 text-xs font-semibold sm:w-auto"
          onClick={() => {
            setInviteOpen(true);
            setConnectOpen(false);
          }}
        >
          신규 계정 초대
        </button>
        {account.status === "invite_pending" ? (
          <button
            type="button"
            disabled={pending}
            className="w-full rounded-md border px-3 py-2 text-xs sm:w-auto"
            onClick={() =>
              start(async () => {
                const res = await cancelMemberGymOwnerInviteAction(memberGymId);
                if (!res.ok) setError(res.error.message);
                else refreshMsg("초대를 취소했습니다.");
              })
            }
          >
            초대 취소
          </button>
        ) : null}
        {account.status === "access_suspended" ? (
          <button
            type="button"
            disabled={pending}
            className="w-full rounded-md bg-matchon-primary px-3 py-2 text-xs font-semibold text-white sm:w-auto"
            onClick={() =>
              start(async () => {
                const res = await setMemberGymOwnerAccessSuspendedAction({
                  memberGymId,
                  suspended: false,
                });
                if (!res.ok) setError(res.error.message);
                else refreshMsg("접근을 복구했습니다.");
              })
            }
          >
            접근 복구
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || account.isPlaceholder}
            className="w-full rounded-md border px-3 py-2 text-xs sm:w-auto disabled:opacity-50"
            onClick={() =>
              start(async () => {
                const res = await setMemberGymOwnerAccessSuspendedAction({
                  memberGymId,
                  suspended: true,
                });
                if (!res.ok) setError(res.error.message);
                else refreshMsg("접근을 중지했습니다.");
              })
            }
          >
            접근 중지
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-md border border-red-200 px-3 py-2 text-xs text-red-700 sm:w-auto"
          onClick={() => {
            if (
              !window.confirm(
                "대표 계정을 임시 계정으로 되돌릴까요? (owner는 비울 수 없어 placeholder로 교체됩니다.)",
              )
            ) {
              return;
            }
            start(async () => {
              const res = await disconnectMemberGymOwnerAction(memberGymId);
              if (!res.ok) setError(res.error.message);
              else refreshMsg("임시 계정으로 전환했습니다.");
            });
          }}
        >
          연결 해제
        </button>
      </div>

      {message ? (
        <p className="rounded bg-matchon-primary-light px-3 py-2 text-xs text-matchon-primary">
          {message}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {inviteUrl ? (
        <div className="rounded border border-matchon-border p-3 text-xs">
          <p className="font-medium">초대 링크 (이메일 발송 없음 · 복사만)</p>
          {inviteTarget ? (
            <p className="mt-1 text-matchon-text-secondary">
              대상: {inviteTarget.name}
              {inviteTarget.email ? ` · ${inviteTarget.email}` : ""}
              {inviteTarget.phone
                ? ` · ${formatPhoneNumber(inviteTarget.phone)}`
                : ""}
            </p>
          ) : null}
          <p className="mt-1 break-all text-matchon-text-secondary">{inviteUrl}</p>
          <button
            type="button"
            className="mt-2 rounded border px-2 py-1 font-semibold"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteUrl);
              setMessage("초대 링크를 복사했습니다.");
            }}
          >
            초대 링크 복사
          </button>
        </div>
      ) : null}

      {connectOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="rounded-md border border-matchon-border bg-matchon-surface p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold">기존 계정 연결</p>
          <form
            className="mt-2 grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                setError(null);
                const res = await searchMemberGymOwnerUsersAction({
                  memberGymId,
                  email: String(fd.get("email") || "") || undefined,
                  phone: String(fd.get("phone") || "") || undefined,
                  name: String(fd.get("name") || "") || undefined,
                });
                if (!res.ok) {
                  setError(res.error.message);
                  return;
                }
                setHits(res.data);
              });
            }}
          >
            <input
              name="email"
              placeholder="이메일"
              className="rounded border px-2 py-1.5 text-sm"
            />
            <input
              name="phone"
              placeholder="휴대전화"
              className="rounded border px-2 py-1.5 text-sm"
            />
            <input
              name="name"
              placeholder="이름"
              className="rounded border px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                검색
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-xs"
                onClick={() => setConnectOpen(false)}
              >
                닫기
              </button>
            </div>
          </form>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {hits.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white px-2 py-1.5"
              >
                <div className="min-w-0 text-xs">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-matchon-text-secondary">
                    {h.email ?? "-"} · {formatPhoneDisplay(h.phone)} · {h.role}
                  </p>
                  {h.blockReason ? (
                    <p className="text-red-600">{h.blockReason}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!h.canConnect || pending}
                  className="rounded border px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  onClick={() => setConfirmConnect(h)}
                >
                  선택
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {confirmConnect ? (
        <div
          role="dialog"
          aria-modal="true"
          className="rounded-md border border-matchon-border bg-white p-3 shadow-sm"
        >
          <p className="text-sm">
            이 계정을 회원사 「{gymName}」의 대표 계정으로 연결할까요?
          </p>
          <p className="mt-1 text-xs text-matchon-text-secondary">
            {confirmConnect.name} · {confirmConnect.email}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              className="rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white"
              onClick={() =>
                start(async () => {
                  const res = await connectMemberGymOwnerAction({
                    memberGymId,
                    targetUserId: confirmConnect.id,
                  });
                  if (!res.ok) {
                    setError(res.error.message);
                    return;
                  }
                  setConfirmConnect(null);
                  setConnectOpen(false);
                  refreshMsg("계정을 연결했습니다.");
                })
              }
            >
              연결
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-xs"
              onClick={() => setConfirmConnect(null)}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      {inviteOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="rounded-md border border-matchon-border bg-matchon-surface p-3"
        >
          <p className="font-semibold">신규 계정 초대</p>
          <form
            className="mt-2 grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const name = String(fd.get("name") || "");
              const email = String(fd.get("email") || "");
              const phone = String(fd.get("phone") || "") || undefined;
              start(async () => {
                setError(null);
                const res = await inviteMemberGymOwnerAction({
                  memberGymId,
                  name,
                  email,
                  phone,
                });
                if (!res.ok) {
                  setError(res.error.message);
                  return;
                }
                setInviteTarget({
                  name,
                  email,
                  phone: phone ?? "",
                });
                setInviteUrl(res.data.inviteUrl);
                setInviteOpen(false);
                refreshMsg("초대를 생성했습니다. 링크를 복사해 전달하세요.");
              });
            }}
          >
            <input
              name="name"
              required
              defaultValue={account.inviteDefaults.name}
              placeholder="대표자 이름"
              className="rounded border px-2 py-1.5 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              defaultValue={account.inviteDefaults.email}
              placeholder="이메일"
              className="rounded border px-2 py-1.5 text-sm"
            />
            <PhoneInput
              name="phone"
              label="휴대전화"
              defaultValue={account.inviteDefaults.phone}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                초대 생성
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-xs"
                onClick={() => setInviteOpen(false)}
              >
                닫기
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
