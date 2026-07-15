"use client";

import { useState } from "react";
import { confirmJudgeIdentityAction } from "@/features/judge/actions";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import type { ResolvedJudgeSession } from "@/lib/services/judge-credential.service";
import { judgeFieldInputClass } from "@/lib/ui/judge-ui";

export function JudgeIdentityForm({
  session,
  initial,
}: {
  session: ResolvedJudgeSession;
  initial: {
    verifiedName: string;
    birthDate: string;
    phone: string;
    organization: string;
    identityConfirmed: boolean;
  };
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState(initial.verifiedName);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [phone, setPhone] = useState(initial.phone);
  const [organization, setOrganization] = useState(initial.organization);

  return (
    <form
      className="flex w-full max-w-md flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set("verifiedName", verifiedName);
        fd.set("birthDate", birthDate);
        fd.set("phone", phone);
        fd.set("organization", organization);

        setPending(true);
        try {
          const res = await confirmJudgeIdentityAction(fd);
          if (!res.ok) {
            setError(res.error.message);
            return;
          }
          window.location.assign(res.data.redirectTo);
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-muted-foreground text-sm leading-relaxed">
        채점 기록에 남을 심판 정보를 확인해 주세요. 성함과 생년월일은 채점
        제출 기록에 사용됩니다.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">성함</span>
        <input
          name="verifiedName"
          required
          maxLength={80}
          value={verifiedName}
          onChange={(e) => setVerifiedName(e.target.value)}
          className={judgeFieldInputClass}
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">생년월일</span>
        <AppDateInput
          name="birthDate"
          required
          disallowFuture
          value={birthDate}
          onValueChange={setBirthDate}
          aria-label="생년월일"
          inputClassName={judgeFieldInputClass}
        />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">연락처 (선택)</span>
        <input
          name="phone"
          maxLength={40}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={judgeFieldInputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">소속 (선택)</span>
        <input
          name="organization"
          maxLength={120}
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className={judgeFieldInputClass}
        />
      </label>

      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}

      <Button type="submit" disabled={pending} size="field" className="w-full sm:w-auto">
        {pending ? "저장 중…" : initial.identityConfirmed ? "정보 수정 후 계속" : "본인 확인 완료"}
      </Button>

      <p className="text-muted-foreground text-xs">
        현재 로그인: {session.loginId} / {session.roleLabel}
      </p>
    </form>
  );
}
