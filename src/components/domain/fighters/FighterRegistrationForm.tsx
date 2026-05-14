"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitFighterRegistrationFormAction } from "@/features/registrations/actions";
import { Button, buttonVariants } from "@/components/ui/button";
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
    const consentRequired = state.data.consentRequired;
    const consentUrl = state.data.consentUrl;
    return (
      <div
        className="ring-foreground/10 space-y-3 rounded-xl bg-card p-6 ring-1"
        role="status"
      >
        <p className="font-medium">
          등록 요청이 제출되었습니다. 체육관 확인 후 정식 선수로 등록됩니다.
        </p>
        {dup ? (
          <p className="text-amber-700 text-sm dark:text-amber-400">
            기존 선수와 정보가 유사합니다. 중복 확인이 필요합니다.
          </p>
        ) : null}
        {consentRequired && consentUrl ? (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm leading-relaxed">
            <p className="font-medium text-sky-950 dark:text-sky-100">
              미성년·학생 등록으로 보호자 동의가 필요합니다.
            </p>
            <p className="text-muted-foreground mt-1">
              보호자 분께 아래 링크를 전달해 동의서 작성 및 서명을 완료해 주세요.
            </p>
            <Link
              href={consentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
            >
              보호자 동의서 열기
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">{heading}</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        주민등록번호는 수집하지 않습니다. 입력 정보는 체육관 검토용으로만
        사용됩니다.
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

        <p className="text-muted-foreground text-xs">
          미성년·학생 정보 또는 보호자 연락처가 있으면 제출 후 보호자 동의 링크가
          표시됩니다.
        </p>

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "제출 중…" : "등록 요청 제출"}
        </Button>
      </form>
    </div>
  );
}
