"use client";

import { useRouter } from "next/navigation";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FeedbackTone } from "@/components/shared/FeedbackMessage";

export type CourtJudgeUnavailableVariant =
  | "invalid_court"
  | "inactive_court"
  | "client_error";

const COPY: Record<
  CourtJudgeUnavailableVariant,
  { title: string; lines: string[]; badge: string; tone: FeedbackTone }
> = {
  invalid_court: {
    title: "경기장을 찾을 수 없습니다.",
    lines: [
      "QR 인증은 통과했지만 경기장 정보를 불러오지 못했습니다.",
      "운영자에게 경기장 설정을 확인해 달라고 요청해 주세요.",
    ],
    badge: "경기장 오류",
    tone: "error",
  },
  inactive_court: {
    title: "입장할 수 없습니다.",
    lines: ["현재 사용하지 않는 경기장입니다.", "운영자에게 문의해 주세요."],
    badge: "비활성",
    tone: "warning",
  },
  client_error: {
    title: "화면을 불러오지 못했습니다.",
    lines: [
      "심판 화면을 표시하는 중 오류가 발생했습니다.",
      "새로고침 후에도 반복되면 운영자에게 문의해 주세요.",
    ],
    badge: "화면 오류",
    tone: "error",
  },
};

export function CourtJudgeUnavailableState({
  variant,
  roleLabel,
  eventTitle,
  courtName,
  onRefresh,
  refreshLabel = "새로고침",
}: {
  variant: CourtJudgeUnavailableVariant;
  roleLabel: string;
  eventTitle?: string | null;
  courtName?: string | null;
  onRefresh?: () => void;
  refreshLabel?: string;
}) {
  const router = useRouter();
  const copy = COPY[variant];

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 p-6">
      <header className="space-y-3 text-center">
        <MatchonLogo size="md" variant="light" className="justify-center" />
        {eventTitle ? (
          <p className="text-muted-foreground text-sm">{eventTitle}</p>
        ) : null}
        {courtName ? <p className="text-lg font-semibold">{courtName}</p> : null}
        <MatchonStatusBadge
          status={roleLabel === "주심판" ? "active" : "in_progress"}
          label={roleLabel}
          size="sm"
        />
      </header>

      <Card variant="default" className="py-4">
        <CardContent className="space-y-3 px-4 text-center">
          <MatchonStatusBadge
            status={copy.tone === "error" ? "cancelled" : "waiting"}
            label={copy.badge}
            size="sm"
          />
          <h1 className="text-lg font-semibold">{copy.title}</h1>
          <FeedbackMessage tone={copy.tone}>
            {copy.lines.map((line) => (
              <span key={line} className="block text-sm font-normal">
                {line}
              </span>
            ))}
          </FeedbackMessage>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="outline"
          size="field"
          className="sm:w-auto"
          onClick={() => (onRefresh ? onRefresh() : router.refresh())}
        >
          {refreshLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="field"
          className="sm:w-auto"
          onClick={() => router.back()}
        >
          뒤로가기
        </Button>
      </div>
    </div>
  );
}
