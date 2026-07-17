"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitGymApplicationAction } from "@/features/gym-applications/actions";
import { Button } from "@/components/ui/button";
import {
  authLoginErrorClass,
  authLoginFieldStackClass,
  authLoginFormClass,
  authLoginInputClass,
  authLoginLabelClass,
  authLoginSecondaryNoteClass,
} from "@/lib/ui/auth-login-ui";

type State = Awaited<ReturnType<typeof submitGymApplicationAction>> | null;

function Field({
  id,
  name,
  label,
  required,
  type = "text",
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className={authLoginFieldStackClass}>
      <label htmlFor={id} className={authLoginLabelClass}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        className={authLoginInputClass}
      />
    </div>
  );
}

export function GymApplicationForm() {
  const [state, formAction, pending] = useActionState(
    submitGymApplicationAction,
    null as State,
  );

  if (state?.ok) {
    return (
      <div className="space-y-4 text-left">
        <p className="text-sm text-matchon-text-secondary">
          체육관 가입 신청이 접수되었습니다. 플랫폼 관리자 검토 후 계정 초대
          링크가 발급됩니다. 협회 소속은 가입과 별도로, 로그인 후「협회 연결」에서
          신청할 수 있습니다.
        </p>
        <Link
          href="/login"
          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
        >
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className={authLoginFormClass}>
      <Field id="gymName" name="gymName" label="체육관명" required />
      <Field
        id="representativeName"
        name="representativeName"
        label="대표자명"
        required
      />
      <Field id="contactName" name="contactName" label="담당자명" required />
      <Field id="mobilePhone" name="mobilePhone" label="휴대폰" required />
      <Field id="phone" name="phone" label="유선전화" />
      <Field id="email" name="email" label="이메일" type="email" required />
      <Field id="postalCode" name="postalCode" label="우편번호" />
      <Field id="address" name="address" label="주소" />
      <Field id="addressDetail" name="addressDetail" label="상세주소" />
      <div className={authLoginFieldStackClass}>
        <label htmlFor="description" className={authLoginLabelClass}>
          소개
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className={authLoginInputClass}
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
        <input type="checkbox" name="termsAccepted" required className="mt-1" />
        이용약관에 동의합니다.
      </label>
      <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
        <input
          type="checkbox"
          name="privacyAccepted"
          required
          className="mt-1"
        />
        개인정보 처리에 동의합니다.
      </label>

      <p className={authLoginSecondaryNoteClass}>
        협회 선택이 필요하지 않습니다. MATCHON에 독립 가입한 뒤 공개 대회에
        참가할 수 있습니다.
      </p>

      {state && !state.ok ? (
        <p className={authLoginErrorClass}>{state.error.message}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full font-bold">
        {pending ? "제출 중…" : "가입 신청"}
      </Button>
    </form>
  );
}
