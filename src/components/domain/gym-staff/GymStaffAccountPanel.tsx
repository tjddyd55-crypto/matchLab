"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  checkGymStaffAccountLoginIdAction,
  createGymStaffLoginAccountAction,
  resetGymStaffTemporaryPasswordAction,
} from "@/features/gym-staff-account/actions";
import { generateTemporaryPassword } from "@/lib/fighter-login";
import {
  GYM_STAFF_ACCOUNT_STATUS_LABEL,
  type GymStaffAccountStatusKind,
} from "@/lib/gym-staff-account/status";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

type CredentialsReveal = {
  kind: "created" | "reset";
  staffName: string;
  loginId: string;
  temporaryPassword: string;
};

function buildShareMessage(input: CredentialsReveal): string {
  return [
    "[MATCHON 선생님 로그인 안내]",
    "",
    `이름: ${input.staffName}`,
    `로그인 아이디: ${input.loginId}`,
    `임시 비밀번호: ${input.temporaryPassword}`,
    "",
    "로그인 주소: /login",
    "최초 로그인 후 새로운 비밀번호로 변경해 주세요.",
  ].join("\n");
}

/**
 * 선생님 로그인 계정 패널.
 * 관장이 아이디·임시 비밀번호를 직접 발급한다. 평문은 완료 모달에서만 한 번 표시.
 */
export function GymStaffAccountPanel({
  staffId,
  staffName,
  loginId,
  hasAccount,
  statusKind,
  mustChangePassword,
  staffActive,
  accountCreatedAt,
  passwordIssuedAt,
}: {
  staffId: string;
  staffName: string;
  loginId: string | null;
  hasAccount: boolean;
  statusKind: GymStaffAccountStatusKind;
  mustChangePassword: boolean;
  staffActive: boolean;
  accountCreatedAt?: string | null;
  passwordIssuedAt?: string | null;
  /** @deprecated */
  activeSetupExpiresAt?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [reveal, setReveal] = useState<CredentialsReveal | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [newLoginId, setNewLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginIdHint, setLoginIdHint] = useState<string | null>(null);

  const displayStatus = useMemo(() => {
    if (!hasAccount) return "no_account" as const;
    if (mustChangePassword) return "password_change_required" as const;
    return statusKind === "active" ? "active" : statusKind;
  }, [hasAccount, mustChangePassword, statusKind]);

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("클립보드 복사에 실패했습니다. 직접 선택해 복사해 주세요.");
    }
  }

  function fillGeneratedPassword() {
    const generated = generateTemporaryPassword(12);
    setPassword(generated);
    setPasswordConfirm(generated);
    setShowPassword(true);
  }

  function resetCreateForm() {
    setNewLoginId("");
    setPassword("");
    setPasswordConfirm("");
    setShowPassword(false);
    setLoginIdHint(null);
    setError(null);
  }

  async function checkLoginId() {
    const res = await checkGymStaffAccountLoginIdAction({
      loginId: newLoginId,
    });
    if (!res.ok) {
      setLoginIdHint(res.error.message);
      return false;
    }
    if (!res.data.available) {
      setLoginIdHint(res.data.message ?? "이미 사용 중인 아이디입니다.");
      return false;
    }
    setLoginIdHint(null);
    return true;
  }

  function submitCreate() {
    setError(null);
    startTransition(async () => {
      const okId = await checkLoginId();
      if (!okId) return;
      const res = await createGymStaffLoginAccountAction({
        staffId,
        loginId: newLoginId,
        temporaryPassword: password,
        temporaryPasswordConfirm: passwordConfirm,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setCreateOpen(false);
      setReveal({
        kind: "created",
        staffName,
        loginId: res.data.loginId,
        temporaryPassword: password,
      });
      resetCreateForm();
    });
  }

  function submitReset() {
    setError(null);
    setConfirmResetOpen(false);
    startTransition(async () => {
      const res = await resetGymStaffTemporaryPasswordAction({
        staffId,
        temporaryPassword: password,
        temporaryPasswordConfirm: passwordConfirm,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setResetOpen(false);
      setReveal({
        kind: "reset",
        staffName,
        loginId: res.data.loginId,
        temporaryPassword: password,
      });
      setPassword("");
      setPasswordConfirm("");
      setShowPassword(false);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-matchon-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">선생님 로그인 계정</h3>
        <span className="rounded-md border border-matchon-border px-2 py-0.5 text-xs font-medium text-matchon-text-secondary">
          {GYM_STAFF_ACCOUNT_STATUS_LABEL[displayStatus] ??
            GYM_STAFF_ACCOUNT_STATUS_LABEL.no_account}
        </span>
      </div>

      {!hasAccount ? (
        <div className="space-y-3">
          <p className="text-sm text-matchon-text-secondary">
            아직 로그인 계정이 없습니다. 아이디와 임시 비밀번호를 만들어
            선생님에게 안내해 주세요.
          </p>
          <Button
            type="button"
            size="sm"
            disabled={pending || !staffActive}
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            로그인 계정 만들기
          </Button>
          {!staffActive ? (
            <p className="text-xs text-destructive">
              비활성 선생님에게는 계정을 만들 수 없습니다.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-matchon-text-secondary">로그인 아이디</span>{" "}
              <span className="font-mono font-medium">{loginId}</span>
            </p>
            <p>
              <span className="text-matchon-text-secondary">계정 상태</span>{" "}
              {staffActive ? "사용 중" : "로그인 제한"}
            </p>
            <p>
              <span className="text-matchon-text-secondary">비밀번호 상태</span>{" "}
              {mustChangePassword ? "변경 필요" : "설정 완료"}
            </p>
            <p>
              <span className="text-matchon-text-secondary">계정 생성일</span>{" "}
              {accountCreatedAt
                ? new Date(accountCreatedAt).toLocaleString("ko-KR")
                : "—"}
            </p>
            <p>
              <span className="text-matchon-text-secondary">비밀번호 발급</span>{" "}
              {passwordIssuedAt
                ? new Date(passwordIssuedAt).toLocaleString("ko-KR")
                : "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!loginId}
              onClick={() => loginId && void copyText("id", loginId)}
            >
              {copied === "id" ? "복사됨" : "아이디 복사"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || !staffActive}
              onClick={() => {
                setPassword("");
                setPasswordConfirm("");
                setShowPassword(false);
                setError(null);
                setResetOpen(true);
              }}
            >
              임시 비밀번호 재설정
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {/* 계정 만들기 */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>선생님 로그인 계정 만들기</DialogTitle>
            <DialogDescription>
              선생님이 로그인할 때 사용할 아이디와 임시 비밀번호를 입력해 주세요.
              로그인 아이디는 계정 생성 후 변경이 제한될 수 있으므로 확인해
              주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">로그인 아이디</span>
              <input
                className={matchonFieldInputClass}
                value={newLoginId}
                onChange={(e) => setNewLoginId(e.target.value)}
                onBlur={() => void checkLoginId()}
                autoComplete="off"
                disabled={pending}
              />
              {loginIdHint ? (
                <span className="text-xs text-destructive">{loginIdHint}</span>
              ) : null}
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">임시 비밀번호</span>
              <input
                className={matchonFieldInputClass}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={pending}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">임시 비밀번호 확인</span>
              <input
                className={matchonFieldInputClass}
                type={showPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={pending}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={fillGeneratedPassword}
              >
                안전한 임시 비밀번호 생성
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "비밀번호 숨김" : "비밀번호 표시"}
              </Button>
            </div>
            <p className="text-xs text-matchon-text-secondary">
              비밀번호는 8자 이상이어야 하며, 아이디와 같을 수 없습니다.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={submitCreate}
            >
              {pending ? "만드는 중…" : "계정 만들기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 임시 비밀번호 재설정 */}
      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setResetOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>임시 비밀번호 재설정</DialogTitle>
            <DialogDescription>
              새로운 임시 비밀번호를 설정하면 기존 비밀번호로는 로그인할 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">새 임시 비밀번호</span>
              <input
                className={matchonFieldInputClass}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">새 임시 비밀번호 확인</span>
              <input
                className={matchonFieldInputClass}
                type={showPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={pending}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={fillGeneratedPassword}
              >
                안전한 임시 비밀번호 생성
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "비밀번호 숨김" : "비밀번호 표시"}
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setResetOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => setConfirmResetOpen(true)}
            >
              비밀번호 변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmResetOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setConfirmResetOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>임시 비밀번호를 변경할까요?</DialogTitle>
            <DialogDescription>
              변경 즉시 기존 비밀번호로는 로그인할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmResetOpen(false)}
            >
              취소
            </Button>
            <Button type="button" disabled={pending} onClick={submitReset}>
              {pending ? "변경 중…" : "비밀번호 변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 완료 안내 — 평문은 메모리에만 */}
      <Dialog
        open={Boolean(reveal)}
        onOpenChange={(open) => {
          if (!open) setReveal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reveal?.kind === "reset"
                ? "임시 비밀번호가 재설정되었습니다"
                : "로그인 계정이 만들어졌습니다"}
            </DialogTitle>
            <DialogDescription>
              아래 정보를 선생님에게 전달해 주세요. 임시 비밀번호는 이 화면을
              닫으면 다시 확인할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {reveal ? (
            <div className="space-y-3 text-sm">
              <p>
                선생님 이름: <strong>{reveal.staffName}</strong>
              </p>
              <p className="font-mono">아이디: {reveal.loginId}</p>
              <p className="font-mono">임시 비밀번호: {reveal.temporaryPassword}</p>
              <p className="text-xs text-matchon-text-secondary">
                최초 로그인 시 새 비밀번호로 변경해야 합니다.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyText("rid", reveal.loginId)}
                >
                  {copied === "rid" ? "복사됨" : "아이디 복사"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void copyText("rpw", reveal.temporaryPassword)
                  }
                >
                  {copied === "rpw" ? "복사됨" : "임시 비밀번호 복사"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void copyText("all", buildShareMessage(reveal))
                  }
                >
                  {copied === "all" ? "복사됨" : "로그인 정보 전체 복사"}
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setReveal(null)}>
              확인했습니다
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
