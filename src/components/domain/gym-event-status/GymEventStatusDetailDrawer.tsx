"use client";

import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { OrganizerCustomFormAnswersSection } from "@/components/domain/applications/OrganizerCustomFormAnswersSection";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge";
import { DrawerPanel } from "@/components/ui/drawer-panel";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GymEventApplicationStatusRowDTO } from "@/lib/services/gym-event-status.service";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import { matchonCardStackClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 text-sm">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function resolveApplicationFormMatchonStatus(
  key: GymEventApplicationStatusRowDTO["applicationFormStatusKey"],
): MatchonStatus {
  switch (key) {
    case "custom_form":
    case "pdf_document":
      return "application_completed";
    case "needs_completion":
      return "signature_pending";
    case "none":
    default:
      return "inactive";
  }
}

export function GymEventStatusDetailDrawer({
  row,
  publicSlug,
  open,
  onOpenChange,
}: {
  row: GymEventApplicationStatusRowDTO | null;
  publicSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  const hasBracketInfo =
    row.bracketGenerated ||
    row.opponentName ||
    row.matchNumber != null ||
    row.globalMatchOrder != null ||
    row.resultSummary;

  return (
    <DrawerPanel
      open={open}
      onOpenChange={onOpenChange}
      title={row.fighterName}
      description={row.divisionLabel}
      headerExtra={
        <>
          <ApplicationStatusBadge status={row.applicationStatus} />
          <PaymentStatusBadge status={row.paymentStatus} />
        </>
      }
    >
      <div className={cn("flex min-w-0 flex-col pb-2", matchonCardStackClass)}>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/15 pb-3">
            <CardTitle className="text-base">신청 기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <DetailRow label="신청 상태">
              <ApplicationStatusBadge status={row.applicationStatus} />
            </DetailRow>
            <DetailRow label="입금 상태">
              <PaymentStatusBadge status={row.paymentStatus} />
            </DetailRow>
            <DetailRow label="신청서 상태">
              <MatchonStatusBadge
                status={resolveApplicationFormMatchonStatus(
                  row.applicationFormStatusKey,
                )}
                label={row.applicationFormStatusLabel}
                size="sm"
              />
            </DetailRow>
            <DetailRow label="현장 확인">
              <CheckInStatusBadge status={row.checkInStatus} />
            </DetailRow>
            <DetailRow label="계체 결과">
              <WeighInStatusBadge status={row.weighInStatus} />
            </DetailRow>
            <DetailRow label="출전 확정">
              <EligibilityBadge
                label={row.eligibilityLabel}
                isEligible={row.isEligibleForBracket}
                title={row.eligibilityReason}
              />
            </DetailRow>
          </CardContent>
        </Card>

        {row.customFormSnapshot ? (
          <Card className="gap-0 py-0">
            <CardHeader className="border-b bg-muted/15 pb-3">
              <CardTitle className="text-base">신청서 / 동의</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <OrganizerCustomFormAnswersSection snapshot={row.customFormSnapshot} />
            </CardContent>
          </Card>
        ) : null}

        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/15 pb-3">
            <CardTitle className="text-base">대진 / 결과</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <DetailRow label="대진">
              {row.bracketGenerated ? (
                <span className="text-sm">
                  {row.bracketAssigned ? "배정됨" : "미배정"}
                  {row.matchSummary ? ` · ${row.matchSummary}` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">
                  대진 미생성
                </span>
              )}
            </DetailRow>
            {row.opponentName ? (
              <DetailRow label="상대 선수">
                <span className="text-sm">
                  {row.opponentName}
                  {row.opponentGymName ? ` (${row.opponentGymName})` : ""}
                </span>
              </DetailRow>
            ) : null}
            {row.matchNumber != null || row.globalMatchOrder != null ? (
              <DetailRow label="경기 순서">
                <span className="text-sm">
                  {row.matchNumber != null ? `#${row.matchNumber}` : ""}
                  {row.globalMatchOrder != null
                    ? ` · 전역 ${row.globalMatchOrder}`
                    : ""}
                  {row.matchStatusLabel ? ` · ${row.matchStatusLabel}` : ""}
                </span>
              </DetailRow>
            ) : null}
            <DetailRow label="결과">
              <span className="text-sm">{row.resultSummary ?? "—"}</span>
            </DetailRow>
            {!hasBracketInfo ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                아직 대진 정보가 없습니다.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {row.memo ? (
          <Card className="gap-0 py-0">
            <CardHeader className="border-b bg-muted/15 pb-3">
              <CardTitle className="text-base">신청 메모</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                {row.memo}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {row.bracketGenerated ? (
          <div className="border-t pt-4">
            <Link
              href={`/events/${publicSlug}/brackets`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "field" }),
                "w-full",
              )}
            >
              공개 대진표 보기
            </Link>
          </div>
        ) : null}
      </div>
    </DrawerPanel>
  );
}
