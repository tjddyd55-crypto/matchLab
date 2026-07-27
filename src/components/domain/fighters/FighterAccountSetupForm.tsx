"use client";

import { useRef, useState } from "react";
import {
  checkFighterAccountLoginIdAction,
  completeFighterAccountSetupAction,
} from "@/features/fighter-account/actions";
import { Button } from "@/components/ui/button";

type FormStatus = "idle" | "submitting" | "success" | "error";
type LoginIdCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

const LOGIN_ID_HELP =
  "4~20자의 영문 소문자, 숫자, 특수문자 _ - 만 사용할 수 있습니다.";

export function FighterAccountSetupForm({
  token,
  fighterName,
  gymName,
  existingLoginId,
}: {
  token: string;
  fighterName: string;
  gymName: string;
  existingLoginId: string | null;
}) {
  const submittingRef = useRef(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [loginId, setLoginId] = useState(existingLoginId ?? "");
  const [loginIdCheck, setLoginIdCheck] =
    useState<LoginIdCheckStatus>(
      existingLoginId ? "available" : "idle",
    );
  const [loginIdMessage, setLoginIdMessage] = useState<string | null>(
    existingLoginId ? "현재 아이디입니다. 변경하려면 중복확인을 다시 해 주세요." : null,
  );
  const [checkedLoginId, setCheckedLoginId] = useState<string | null>(
    existingLoginId,
  );

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

  const normalizedLogin = loginId.trim().toLowerCase();
  const loginIdUnchanged =
    Boolean(existingLoginId) &&
    normalizedLogin === existingLoginId!.toLowerCase();

  const loginIdReady =
    loginIdUnchanged ||
    (loginIdCheck === "available" &&
      checkedLoginId !== null &&
      checkedLoginId === normalizedLogin);

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
    const res = await checkFighterAccountLoginIdAction({
      loginId: value,
      setupToken: token,
    });
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
      res.data.message ?? "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.",
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
            const res = await completeFighterAccountSetupAction({
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
            setStatus("success");
            const q = new URLSearchParams({
              activated: "1",
              loginId: res.data.loginId,
            });
            window.location.assign(`/login?${q.toString()}`);
          } catch {
            setError(
              "계정 설정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
            );
            setStatus("error");
            submittingRef.current = false;
          }
        })();
      }}
    >
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-matchon-text-primary">
          계정 정보
        </h2>
        <dl className="space-y-1.5 text-sm text-matchon-text-secondary">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-matchon-text-primary">선수명</dt>
            <dd>{fighterName}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-matchon-text-primary">소속 체육관</dt>
            <dd>{gymName || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-matchon-text-primary">
          로그인 정보
        </h2>
        <p className="text-xs text-matchon-text-secondary">
          MATCHON에서 사용할 로그인 아이디와 비밀번호를 설정해 주세요.
        </p>

        <div className="space-y-1.5">
          <label
            htmlFor="fighter-setup-login-id"
            className="block text-xs font-medium"
          >
            로그인 아이디
          </label>
          <div className="flex gap-2">
            <input
              id="fighter-setup-login-id"
              name="loginId"
              autoComplete="username"
              value={loginId}
              disabled={formLocked}
              onChange={(e) => {
                setLoginId(e.target.value);
                setLoginIdCheck("idle");
                setCheckedLoginId(null);
                setLoginIdMessage(null);
              }}
              className="border-input h-11 min-w-0 flex-1 rounded-md border px-3 text-base"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 shrink-0"
              disabled={formLocked || loginIdCheck === "checking"}
              onClick={() => void runDuplicateCheck()}
            >
              {loginIdCheck === "checking" ? "확인 중…" : "중복확인"}
            </Button>
          </div>
          <p className="text-[11px] text-matchon-text-secondary">{LOGIN_ID_HELP}</p>
          {loginIdMessage ? (
            <p
              className={
                loginIdCheck === "available"
                  ? "text-xs text-matchon-primary"
                  : "text-xs text-destructive"
              }
            >
              {loginIdMessage}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="fighter-setup-password"
            className="block text-xs font-medium"
          >
            비밀번호
          </label>
          <div className="flex gap-2">
            <input
              id="fighter-setup-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              disabled={formLocked}
              onChange={(e) => setPassword(e.target.value)}
              className="border-input h-11 min-w-0 flex-1 rounded-md border px-3 text-base"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 shrink-0"
              disabled={formLocked}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "숨기기" : "표시"}
            </Button>
          </div>
          <p className="text-[11px] text-matchon-text-secondary">
            8자 이상, 아이디와 동일할 수 없습니다.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="fighter-setup-password-confirm"
            className="block text-xs font-medium"
          >
            비밀번호 확인
          </label>
          <div className="flex gap-2">
            <input
              id="fighter-setup-password-confirm"
              name="passwordConfirm"
              type={showPasswordConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={passwordConfirm}
              disabled={formLocked}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="border-input h-11 min-w-0 flex-1 rounded-md border px-3 text-base"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 shrink-0"
              disabled={formLocked}
              onClick={() => setShowPasswordConfirm((v) => !v)}
            >
              {showPasswordConfirm ? "숨기기" : "표시"}
            </Button>
          </div>
          {passwordMismatch ? (
            <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="whitespace-pre-line text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full font-bold"
        disabled={!canSubmit}
      >
        {status === "submitting" ? "처리 중…" : "계정 만들기"}
      </Button>
    </form>
  );
}
