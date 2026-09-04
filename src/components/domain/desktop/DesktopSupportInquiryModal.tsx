"use client";

import { useActionState, useEffect, useState } from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createDesktopSupportInquiryAction } from "@/features/desktop-support-inquiry/actions";
import {
  DESKTOP_SUPPORT_CATEGORY_LABELS,
  DESKTOP_SUPPORT_INQUIRY_CATEGORIES,
  type DesktopSupportInquiryCategoryCode,
} from "@/lib/desktop/support-inquiry";
import { isMatchonDesktopClient } from "@/lib/desktop/client";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import type { ActionResult } from "@/lib/action-result";

type CreateState = ActionResult<{ id: string }> | null;

export function DesktopSupportInquiryModal({
  open,
  onOpenChange,
  defaultCategory,
  initialLoginId = "",
  roleHint = "desktop_login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory: DesktopSupportInquiryCategoryCode;
  initialLoginId?: string;
  roleHint?: string;
}) {
  const [appVersion, setAppVersion] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [loginId, setLoginId] = useState(initialLoginId.trim());
  const [state, formAction, pending] = useActionState(
    createDesktopSupportInquiryAction,
    null as CreateState,
  );

  useEffect(() => {
    if (!open) return;
    scheduleEffectStateUpdate(() => {
      setCategory(defaultCategory);
      setLoginId(initialLoginId.trim());
    });
  }, [open, defaultCategory, initialLoginId]);

  useEffect(() => {
    if (!open) return;
    if (!isMatchonDesktopClient()) return;
    let cancelled = false;
    void window.matchonDesktop?.getAppVersion?.().then((v) => {
      if (!cancelled && typeof v === "string") setAppVersion(v.trim());
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (state?.ok !== true) return;
    const t = window.setTimeout(() => onOpenChange(false), 1200);
    return () => window.clearTimeout(t);
  }, [state, onOpenChange]);

  const title =
    defaultCategory === "password_help"
      ? "비밀번호 찾기"
      : "관리자에게 문의하기";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            접수된 문의는 관리자가 확인합니다. 비밀번호나 인증번호 등 민감정보는
            입력하지 마세요.
          </DialogDescription>
        </DialogHeader>

        {state?.ok === true ? (
          <p className="rounded-md bg-matchon-surface px-3 py-3 text-sm text-matchon-text-primary">
            문의가 접수되었습니다. 확인 후 연락드리겠습니다.
          </p>
        ) : (
          <form
            key={`${defaultCategory}-${open ? "open" : "closed"}`}
            action={formAction}
            className="space-y-3"
            aria-busy={pending || undefined}
          >
            <input type="hidden" name="appVersion" value={appVersion} />
            <input type="hidden" name="roleHint" value={roleHint} />

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-matchon-text-primary">
                문의 유형
              </span>
              <select
                name="category"
                className={matchonFieldInputClass}
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as DesktopSupportInquiryCategoryCode)
                }
                disabled={pending}
                required
              >
                {DESKTOP_SUPPORT_INQUIRY_CATEGORIES.map((code) => (
                  <option key={code} value={code}>
                    {DESKTOP_SUPPORT_CATEGORY_LABELS[code]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-matchon-text-primary">
                이름
              </span>
              <input
                name="name"
                className={matchonFieldInputClass}
                required
                maxLength={80}
                disabled={pending}
                autoComplete="name"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-matchon-text-primary">
                로그인 아이디 (선택)
              </span>
              <input
                name="loginId"
                className={matchonFieldInputClass}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                maxLength={80}
                disabled={pending}
                autoComplete="username"
                placeholder="알고 있다면 입력"
              />
              <span className="block text-xs text-matchon-text-secondary">
                로그인 아이디를 알고 있다면 입력해 주세요. 기억나지 않는 경우
                비워 두고 문의할 수 있습니다.
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-matchon-text-primary">
                연락처 또는 이메일
              </span>
              <input
                name="contact"
                className={matchonFieldInputClass}
                required
                maxLength={120}
                disabled={pending}
                autoComplete="tel"
                placeholder="회신 가능한 연락처"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-matchon-text-primary">
                문의 내용
              </span>
              <textarea
                name="message"
                className={`${matchonFieldInputClass} min-h-[6rem] py-2`}
                required
                maxLength={2000}
                disabled={pending}
                placeholder={
                  defaultCategory === "password_help"
                    ? "비밀번호 재설정이 필요한 사유를 적어 주세요."
                    : "문의 내용을 입력해 주세요."
                }
              />
            </label>

            {appVersion ? (
              <p className="text-xs text-matchon-text-secondary">
                앱 버전 v{appVersion}이(가) 자동 첨부됩니다.
              </p>
            ) : null}

            {state?.ok === false ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error.message}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "접수 중…" : "문의 보내기"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
