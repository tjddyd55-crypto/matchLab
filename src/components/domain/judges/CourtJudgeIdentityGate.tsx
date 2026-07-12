"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  clearCourtJudgeSession,
  readCourtJudgeSession,
  writeCourtJudgeSession,
  type CourtJudgeRole,
  type CourtJudgeSession,
} from "@/lib/court-judge-session";
import {
  getJudgeRoleLabel,
  judgeFieldInputClass,
  resolveJudgeRoleMatchonStatus,
} from "@/lib/ui/judge-ui";

export function CourtJudgeIdentityGate({
  courtId,
  role,
  roleLabel,
  eventTitle,
  courtName,
  children,
}: {
  courtId: string;
  role: CourtJudgeRole;
  roleLabel: string;
  eventTitle: string;
  courtName: string;
  children: (session: CourtJudgeSession) => React.ReactNode;
}) {
  const loadKey = `${courtId}:${role}`;
  const [session, setSession] = useState<CourtJudgeSession | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const hydrated = loadedKey === loadKey;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only session hydration */
    setSession(readCourtJudgeSession(courtId, role));
    setLoadedKey(loadKey);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [courtId, role, loadKey]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const judgeName = String(fd.get("judgeName") ?? "").trim();
    const birthDate = String(fd.get("birthDate") ?? "").trim();
    const saved = writeCourtJudgeSession(courtId, role, { judgeName, birthDate });
    if (!saved) {
      setError("이름과 생년월일을 올바르게 입력해 주세요.");
      return;
    }
    setError(null);
    setSession(saved);
  }

  function switchIdentity() {
    clearCourtJudgeSession(courtId, role);
    setSession(null);
    setError(null);
  }

  if (!hydrated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-4 text-center">
        <BrandLogo size="md" showText className="justify-center" />
        <p className="text-muted-foreground text-sm">입장 정보를 확인 중…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-5 p-4">
        <header className="space-y-3 text-center">
          <BrandLogo size="md" showText className="justify-center" />
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">{eventTitle}</p>
            <p className="text-lg font-semibold">{courtName}</p>
            <MatchonStatusBadge
              status={resolveJudgeRoleMatchonStatus(role)}
              label={roleLabel}
              size="sm"
            />
            <p className="text-base font-semibold">{roleLabel} 입장</p>
          </div>
        </header>
        <Card variant="default" className="py-4">
          <CardContent className="space-y-3 px-4">
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground text-xs font-medium">이름</span>
                <input
                  name="judgeName"
                  required
                  autoComplete="name"
                  className={judgeFieldInputClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground text-xs font-medium">생년월일</span>
                <input
                  name="birthDate"
                  type="date"
                  required
                  autoComplete="bday"
                  className={judgeFieldInputClass}
                />
              </label>
              {error ? (
                <FeedbackMessage tone="error" role="alert">
                  {error}
                </FeedbackMessage>
              ) : null}
              <Button type="submit" size="field" className="w-full">
                입장하기
              </Button>
            </form>
            <p className="text-muted-foreground text-xs leading-relaxed">
              입장 후 이 기기에서 이름과 생년월일이 저장됩니다. 다른 심판이 사용할 때는
              「정보 변경」으로 다시 입력할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground text-xs">
            {session.judgeName} · {getJudgeRoleLabel(role)}
          </p>
          <MatchonStatusBadge
            status={resolveJudgeRoleMatchonStatus(role)}
            label={roleLabel}
            size="sm"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={switchIdentity}>
          정보 변경
        </Button>
      </div>
      {children(session)}
    </div>
  );
}
