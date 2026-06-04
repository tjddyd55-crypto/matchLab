"use client";

import { useActionState } from "react";
import { submitFighterRegistrationFormAction } from "@/features/registrations/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FighterRegistrationForm({
  token,
  heading,
}: {
  token: string;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitFighterRegistrationFormAction,
    null,
  );

  if (state?.ok === true) {
    const dup = state.data.duplicateSuspected;
    return (
      <RegistrationSuccess dup={dup} />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">{heading}</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        주민등록번호는 수집하지 않습니다. 입력 정보는 체육관 검토용으로만
        사용됩니다.
      </p>
      <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm leading-relaxed">
        선수 등록은 체육관 선수 DB에 등록하는 단계입니다. 대회 참가 동의와
        서명은 실제 대회 신청 시 주최측 공식 신청서 양식에 따라 진행됩니다.
      </p>

      {state?.ok === false ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {state.error.message}
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">이름</span>
            <input
              name="name"
              required
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">생년월일</span>
            <input
              name="birthDate"
              type="date"
              required
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">성별</span>
            <select
              name="gender"
              required
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            >
              <option value="">선택</option>
              <option value="male">남</option>
              <option value="female">여</option>
              <option value="other">기타</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">휴대폰</span>
            <input
              name="phone"
              type="tel"
              required
              placeholder="숫자만 또는 하이픈 포함"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">키(cm)</span>
            <input
              name="height"
              type="number"
              step="0.1"
              min="0"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">체중(kg)</span>
            <input
              name="weight"
              type="number"
              step="0.1"
              min="0"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">프로필 이미지 URL (선택)</span>
            <input
              name="profileImageUrl"
              type="url"
              placeholder="https://… (업로드 연동 전)"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">학교명</span>
            <input
              name="schoolName"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">학년</span>
            <input
              name="grade"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">보호자 이름</span>
            <input
              name="guardianName"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">보호자 연락처</span>
            <input
              name="guardianPhone"
              type="tel"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold">로그인 계정</h2>
          <p className="text-muted-foreground text-xs">
            체육관 승인 전에도 로그인할 수 있습니다. 승인 후 대회 신청이 가능합니다.
          </p>
          <label className="space-y-1 text-sm block">
            <span className="font-medium">아이디</span>
            <input
              name="loginId"
              required
              minLength={4}
              maxLength={20}
              pattern="[a-z0-9][a-z0-9_-]{3,19}"
              autoComplete="username"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
            <span className="text-muted-foreground text-xs">
              영문 소문자·숫자·_·- 만, 4~20자
            </span>
          </label>
          <label className="space-y-1 text-sm block">
            <span className="font-medium">비밀번호</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
            <span className="text-muted-foreground text-xs">8자 이상, 공백 없음</span>
          </label>
          <label className="space-y-1 text-sm block">
            <span className="font-medium">비밀번호 확인</span>
            <input
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
        </div>

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "제출 중…" : "등록 요청 제출"}
        </Button>
      </form>
    </div>
  );
}

function RegistrationSuccess({ dup }: { dup: boolean }) {
  return (
    <div
      className="ring-foreground/10 space-y-3 rounded-xl bg-card p-6 ring-1"
      role="status"
    >
      <p className="font-medium">
        등록 요청이 접수되었습니다. 입력한 아이디로 로그인할 수 있으며,
        체육관 승인 후 대회 신청이 가능합니다.
      </p>
      {dup ? (
        <p className="text-amber-700 text-sm dark:text-amber-400">
          기존 선수와 정보가 유사합니다. 중복 확인이 필요합니다.
        </p>
      ) : null}
    </div>
  );
}
