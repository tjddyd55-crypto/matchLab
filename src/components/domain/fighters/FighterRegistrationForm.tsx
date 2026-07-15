"use client";

import { useActionState } from "react";
import { submitFighterRegistrationFormAction } from "@/features/registrations/actions";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { publicApplicationFieldInputClass, publicApplicationFieldSelectClass } from "@/lib/ui/public-application-ui";

export function FighterRegistrationForm({
  token,
}: {
  token: string;
  /** @deprecated 페이지 헤더에서 표시 — 하위 호환용 */
  heading?: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitFighterRegistrationFormAction,
    null,
  );

  if (state?.ok === true) {
    const dup = state.data.duplicateSuspected;
    return <RegistrationSuccess dup={dup} />;
  }

  return (
    <div className="space-y-6">
      <FeedbackMessage tone="info">
        주민등록번호는 수집하지 않습니다. 입력 정보는 체육관 검토용으로만 사용됩니다.
      </FeedbackMessage>

      {state?.ok === false ? (
        <FeedbackMessage tone="error" role="alert">
          {state.error.message}
        </FeedbackMessage>
      ) : null}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="token" value={token} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">선수 기본정보</CardTitle>
            <CardDescription>필수 항목을 입력해 주세요.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">이름</span>
              <input name="name" required className={publicApplicationFieldInputClass} />
            </label>
            <div className="space-y-1.5 text-sm">
              <span className="font-medium">생년월일</span>
              <AppDateInput
                name="birthDate"
                required
                disallowFuture
                aria-label="생년월일"
                inputClassName={publicApplicationFieldInputClass}
              />
            </div>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">성별</span>
              <select name="gender" required className={publicApplicationFieldSelectClass}>
                <option value="">선택</option>
                <option value="male">남</option>
                <option value="female">여</option>
                <option value="other">기타</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">휴대폰</span>
              <input
                name="phone"
                type="tel"
                required
                placeholder="숫자만 또는 하이픈 포함"
                className={publicApplicationFieldInputClass}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">키(cm)</span>
              <input
                name="height"
                type="number"
                step="0.1"
                min="0"
                className={publicApplicationFieldInputClass}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">체중(kg)</span>
              <input
                name="weight"
                type="number"
                step="0.1"
                min="0"
                className={publicApplicationFieldInputClass}
              />
            </label>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">프로필 이미지 URL (선택)</span>
              <input
                name="profileImageUrl"
                type="url"
                placeholder="https://… (업로드 연동 전)"
                className={publicApplicationFieldInputClass}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">학교명</span>
              <input name="schoolName" className={publicApplicationFieldInputClass} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">학년</span>
              <input name="grade" className={publicApplicationFieldInputClass} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">보호자 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">보호자 이름</span>
              <input name="guardianName" className={publicApplicationFieldInputClass} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">보호자 연락처</span>
              <input
                name="guardianPhone"
                type="tel"
                className={publicApplicationFieldInputClass}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">로그인 계정</CardTitle>
            <CardDescription>
              체육관 승인 전에도 로그인할 수 있습니다. 승인 후 대회 신청이 가능합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-1.5 text-sm block">
              <span className="font-medium">아이디</span>
              <input
                name="loginId"
                required
                minLength={4}
                maxLength={20}
                pattern="[a-z0-9][a-z0-9_-]{3,19}"
                autoComplete="username"
                className={publicApplicationFieldInputClass}
              />
              <span className="text-muted-foreground text-xs">
                영문 소문자·숫자·_·- 만, 4~20자
              </span>
            </label>
            <label className="space-y-1.5 text-sm block">
              <span className="font-medium">비밀번호</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={publicApplicationFieldInputClass}
              />
              <span className="text-muted-foreground text-xs">8자 이상, 공백 없음</span>
            </label>
            <label className="space-y-1.5 text-sm block">
              <span className="font-medium">비밀번호 확인</span>
              <input
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                className={publicApplicationFieldInputClass}
              />
            </label>
          </CardContent>
        </Card>

        <Button type="submit" size="field" disabled={pending} className="w-full">
          {pending ? "제출 중…" : "등록 요청 제출"}
        </Button>
      </form>
    </div>
  );
}

function RegistrationSuccess({ dup }: { dup: boolean }) {
  return (
    <Card variant="success">
      <CardHeader>
        <CardTitle>등록 요청이 접수되었습니다</CardTitle>
        <CardDescription>
          입력한 아이디로 로그인할 수 있으며, 체육관 승인 후 대회 신청이 가능합니다.
        </CardDescription>
      </CardHeader>
      {dup ? (
        <CardContent>
          <FeedbackMessage tone="warning">
            기존 선수와 정보가 유사합니다. 중복 확인이 필요합니다.
          </FeedbackMessage>
        </CardContent>
      ) : null}
    </Card>
  );
}
