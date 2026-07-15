"use client";

import { useRef, useState } from "react";
import {
  acceptMemberGymOwnerInviteAction,
  checkMemberGymOwnerInviteLoginIdAction,
} from "@/features/gym-owner-account/actions";
import { formatPhoneDisplay } from "@/lib/phone";

type AcceptStatus = "idle" | "submitting" | "success" | "error";
type LoginIdCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

const LOGIN_ID_HELP =
  "4~20자의 영문 소문자, 숫자, 특수문자 _ - 만 사용할 수 있습니다.";

export function MemberGymOwnerInviteAcceptForm({
  token,
  defaultName,
  inviteEmail,
  invitePhone,
  gymName,
}: {
  token: string;
  defaultName: string;
  inviteEmail: string;
  invitePhone?: string | null;
  gymName?: string;
  /** @deprecated 이메일 local-part 자동 제안 제거 — 미사용 */
  suggestedLoginId?: string;
}) {
  const submittingRef = useRef(false);
  const [status, setStatus] = useState<AcceptStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [loginId, setLoginId] = useState("");
  const [loginIdCheck, setLoginIdCheck] =
    useState<LoginIdCheckStatus>("idle");
  const [loginIdMessage, setLoginIdMessage] = useState<string | null>(null);
  const [checkedLoginId, setCheckedLoginId] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const formLocked = status === "submitting" || status === "success";

  const passwordsMatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm;

  const loginIdReady =
    loginIdCheck === "available" &&
    checkedLoginId !== null &&
    checkedLoginId === loginId.trim().toLowerCase();

  const canSubmit =
    !formLocked &&
    loginIdReady &&
    password.length >= 8 &&
    passwordsMatch &&
    !passwordMismatch;

  async function runDuplicateCheck() {
    if (formLocked || loginIdCheck === "checking") return;
    const value = loginId;
    if (!value.trim()) {
      setLoginIdCheck("unavailable");
      setLoginIdMessage("아이디를 입력해 주세요.");
      setCheckedLoginId(null);
      return;
    }
    setLoginIdCheck("checking");
    setLoginIdMessage(null);
    const res = await checkMemberGymOwnerInviteLoginIdAction(value);
    if (!res.ok) {
      setLoginIdCheck("error");
      setLoginIdMessage(res.error.message);
      setCheckedLoginId(null);
      return;
    }
    if (res.data.available) {
      setLoginIdCheck("available");
      setLoginIdMessage("사용 가능한 아이디입니다.");
      setCheckedLoginId(res.data.loginId);
      return;
    }
    setLoginIdCheck("unavailable");
    setLoginIdMessage(
      res.data.message ??
        "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
    );
    setCheckedLoginId(null);
  }

  return (
    <form
      className="space-y-5 overflow-x-hidden rounded-md border border-matchon-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (submittingRef.current || !canSubmit) return;
        if (!loginIdReady) {
          setError("아이디 중복확인을 완료해 주세요.");
          setStatus("error");
          return;
        }
        if (password !== passwordConfirm) {
          setError("비밀번호가 일치하지 않습니다.");
          setStatus("error");
          return;
        }
        submittingRef.current = true;
        setStatus("submitting");
        setError(null);
        void (async () => {
          try {
            const res = await acceptMemberGymOwnerInviteAction({
              token,
              loginId,
              password,
              passwordConfirm,
            });
            if (!res.ok) {
              setError(res.error.message);
              setStatus("error");
              submittingRef.current = false;
              return;
            }
            if (res.data.alreadyActive) {
              setStatus("success");
              const q = new URLSearchParams({
                activated: "1",
                loginId: res.data.loginId,
              });
              window.location.assign(`/login?${q.toString()}`);
              return;
            }
            setStatus("success");
            const q = new URLSearchParams({
              activated: "1",
              loginId: res.data.loginId,
            });
            window.location.assign(`/login?${q.toString()}`);
          } catch {
            setError(
              "계정 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
            );
            setStatus("error");
            submittingRef.current = false;
          }
        })();
      }}
    >
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-matchon-text-primary">
          체육관 정보
        </h2>
        <dl className="space-y-1.5 text-sm text-matchon-text-secondary">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-matchon-text-primary">체육관명</dt>
            <dd>{gymName || "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-matchon-text-primary">대표자명</dt>
            <dd>{defaultName}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-matchon-text-primary">연락 이메일</dt>
            <dd className="break-all">{inviteEmail || "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-matchon-text-primary">연락처</dt>
            <dd>
              {invitePhone ? formatPhoneDisplay(invitePhone, "") : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-matchon-text-primary">
          로그인 정보
        </h2>
        <p className="text-xs text-matchon-text-secondary">
          연락 이메일은 로그인 아이디로 사용되지 않습니다. 아이디와 비밀번호를
          직접 설정해 주세요.
        </p>

        <div className="space-y-1.5">
          <label
            htmlFor="invite-login-id"
            className="block text-xs font-medium"
          >
            로그인 아이디
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              id="invite-login-id"
              name="loginId"
              required
              autoComplete="username"
              disabled={formLocked}
              value={loginId}
              placeholder="아이디 입력"
              className="min-w-0 flex-1 rounded-md border px-3 py-2.5 text-sm disabled:opacity-60"
              onChange={(e) => {
                setLoginId(e.target.value);
                setLoginIdCheck("idle");
                setLoginIdMessage(null);
                setCheckedLoginId(null);
                setError(null);
              }}
            />
            <button
              type="button"
              disabled={formLocked || loginIdCheck === "checking"}
              onClick={() => void runDuplicateCheck()}
              className="shrink-0 rounded-md border border-matchon-border px-4 py-2.5 text-sm font-medium text-matchon-text-primary disabled:opacity-60 sm:w-28"
            >
              {loginIdCheck === "checking" ? "확인 중…" : "중복확인"}
            </button>
          </div>
          <p className="text-xs text-matchon-text-secondary">{LOGIN_ID_HELP}</p>
          {loginIdMessage ? (
            <p
              className={`whitespace-pre-line text-xs ${
                loginIdCheck === "available"
                  ? "text-matchon-primary"
                  : "text-red-600"
              }`}
              role="status"
            >
              {loginIdMessage}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="invite-password"
            className="block text-xs font-medium"
          >
            비밀번호
          </label>
          <div className="flex gap-2">
            <input
              id="invite-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={formLocked}
              value={password}
              placeholder="비밀번호 입력"
              className="min-w-0 flex-1 rounded-md border px-3 py-2.5 text-sm disabled:opacity-60"
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
            <button
              type="button"
              className="shrink-0 rounded-md border px-3 text-xs"
              disabled={formLocked}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "숨김" : "표시"}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="invite-password-confirm"
            className="block text-xs font-medium"
          >
            비밀번호 확인
          </label>
          <div className="flex gap-2">
            <input
              id="invite-password-confirm"
              name="passwordConfirm"
              type={showPasswordConfirm ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={formLocked}
              value={passwordConfirm}
              placeholder="비밀번호 다시 입력"
              className="min-w-0 flex-1 rounded-md border px-3 py-2.5 text-sm disabled:opacity-60"
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                setError(null);
              }}
            />
            <button
              type="button"
              className="shrink-0 rounded-md border px-3 text-xs"
              disabled={formLocked}
              onClick={() => setShowPasswordConfirm((v) => !v)}
            >
              {showPasswordConfirm ? "숨김" : "표시"}
            </button>
          </div>
          {passwordMismatch ? (
            <p className="text-xs text-red-600" role="status">
              비밀번호가 일치하지 않습니다.
            </p>
          ) : null}
          {passwordsMatch ? (
            <p className="text-xs text-matchon-primary" role="status">
              비밀번호가 일치합니다.
            </p>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="whitespace-pre-line text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {status === "success" ? (
        <p className="text-sm text-matchon-primary">
          활성화 완료. 로그인 화면으로 이동합니다…
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md bg-matchon-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "submitting"
          ? "처리 중..."
          : status === "success"
            ? "활성화 완료"
            : "계정 활성화"}
      </button>
    </form>
  );
}
