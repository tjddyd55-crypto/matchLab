"use client";

import { CourtJudgeRoleUrlSection } from "@/components/domain/judges/CourtJudgeRoleUrlSection";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourtJudgeQrLinkVM } from "@/lib/qr-url";
import { cn } from "@/lib/utils";

export function CourtJudgeCourtCard({
  courtLabel,
  isActive,
  links,
  eventId,
  className,
}: {
  courtLabel: string;
  isActive: boolean;
  links: CourtJudgeQrLinkVM | null;
  eventId: string;
  className?: string;
}) {
  const qrPageHref = `/organizer/events/${eventId}/qr`;

  return (
    <Card
      variant={isActive ? "interactive" : "muted"}
      className={cn("py-4", className)}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base leading-snug">{courtLabel}</CardTitle>
          {links && links.name.trim() !== courtLabel ? (
            <p className="text-muted-foreground text-xs">{links.name}</p>
          ) : null}
        </div>
        <MatchonStatusBadge status={isActive ? "active" : "inactive"} size="sm" />
      </CardHeader>

      <CardContent className="space-y-3 px-4 pt-3">
        {!isActive ? (
          <p className="text-muted-foreground rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs">
            비활성 경기장입니다. 심판 URL·QR은 활성화 후 사용하세요.
          </p>
        ) : null}

        <CourtJudgeRoleUrlSection
          role="score"
          title="채점심판"
          description="점수 입력 전용. 진행중 경기만 채점합니다."
          url={links?.scoreEntryUrl ?? ""}
          printGroup="judge-court-score"
          downloadFileName={`court-score-${links?.name ?? courtLabel}.png`}
          qrPageHref={qrPageHref}
          disabled={!isActive || !links}
        />
        <CourtJudgeRoleUrlSection
          role="head"
          title="주심판"
          description="경기 시작·종료·승패 확정을 처리합니다."
          url={links?.headEntryUrl ?? ""}
          printGroup="judge-court-head"
          downloadFileName={`court-head-${links?.name ?? courtLabel}.png`}
          qrPageHref={qrPageHref}
          disabled={!isActive || !links}
        />
      </CardContent>
    </Card>
  );
}
