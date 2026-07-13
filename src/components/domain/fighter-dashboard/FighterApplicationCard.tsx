import Link from "next/link";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FighterApplicationStatusRowDTO } from "@/lib/services/fighter-event-status.service";
import {
  getFighterApplicationStatusLabel,
  getFighterBracketAssignmentLabel,
  resolveFighterApplicationMatchonStatus,
  resolveFighterBracketAssignmentMatchonStatus,
  resolveFighterCheckInLabelMatchonStatus,
  resolveFighterEligibilityMatchonStatus,
  resolveFighterPaymentDisplayMatchonStatus,
  resolveFighterResultSummaryMatchonStatus,
  resolveFighterWeighInLabelMatchonStatus,
} from "@/lib/ui/fighter-dashboard-ui";
import {
  matchonBlueCornerPanelClass,
  matchonBlueCornerTextClass,
  matchonRedCornerPanelClass,
  matchonRedCornerTextClass,
  matchonVsCardClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export function FighterApplicationCard({
  row,
}: {
  row: FighterApplicationStatusRowDTO;
}) {
  const resultStatus = resolveFighterResultSummaryMatchonStatus(row.resultSummary);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base leading-snug">{row.eventTitle}</CardTitle>
            <CardDescription>
              {row.divisionLabel} · 소속 {row.gymName}
            </CardDescription>
          </div>
          <MatchonStatusBadge
            status={resolveFighterApplicationMatchonStatus(row.applicationStatus)}
            label={getFighterApplicationStatusLabel(row.applicationStatus)}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <MatchonStatusBadge
            status={resolveFighterPaymentDisplayMatchonStatus(row.paymentDisplayLabel)}
            label={row.paymentDisplayLabel}
            size="sm"
          />
          <MatchonStatusBadge
            status={resolveFighterCheckInLabelMatchonStatus(row.checkInStatusLabel)}
            label={row.checkInStatusLabel}
            size="sm"
          />
          <MatchonStatusBadge
            status={resolveFighterWeighInLabelMatchonStatus(row.weighInStatusLabel)}
            label={row.weighInStatusLabel}
            size="sm"
          />
          <MatchonStatusBadge
            status={resolveFighterEligibilityMatchonStatus(row.isEligibleForBracket)}
            label={row.eligibilityLabel}
            size="sm"
          />
        </div>

        {row.bracketGenerated ? (
          <div className="flex flex-col gap-3">
            {row.opponentName ? (
              <div
                className={cn(
                  "grid gap-2 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center",
                  matchonVsCardClass,
                )}
              >
                <div className={cn("min-w-0", matchonRedCornerPanelClass)}>
                  <p className="text-[11px] font-medium opacity-80">나</p>
                  <p className={cn("text-sm", matchonRedCornerTextClass)}>내 경기</p>
                </div>
                <span className="text-muted-foreground text-xs font-bold tracking-widest">
                  VS
                </span>
                <div className={cn("min-w-0", matchonBlueCornerPanelClass)}>
                  <p className="text-[11px] font-medium opacity-80">상대</p>
                  <p className={cn("truncate text-sm", matchonBlueCornerTextClass)}>
                    {row.opponentName}
                  </p>
                  {row.opponentGymName ? (
                    <p className="truncate text-xs opacity-80">{row.opponentGymName}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <dl className={cn("grid gap-2 text-xs", matchonVsCardClass)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground font-medium">대진</dt>
                <dd>
                  <MatchonStatusBadge
                    status={resolveFighterBracketAssignmentMatchonStatus(
                      row.bracketAssigned,
                    )}
                    label={getFighterBracketAssignmentLabel(row.bracketAssigned)}
                    size="sm"
                  />
                </dd>
              </div>
              {row.matchNumber != null || row.globalMatchOrder != null ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">경기 순서</dt>
                  <dd className="tabular-nums">
                    {row.matchNumber != null ? `#${row.matchNumber}` : ""}
                    {row.globalMatchOrder != null
                      ? ` · 전역 ${row.globalMatchOrder}`
                      : ""}
                  </dd>
                </div>
              ) : null}
              {row.matchStatusLabel ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">경기 상태</dt>
                  <dd>{row.matchStatusLabel}</dd>
                </div>
              ) : null}
              {row.resultSummary ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-muted-foreground">결과</dt>
                  <dd>
                    {resultStatus ? (
                      <MatchonStatusBadge
                        status={resultStatus}
                        label={row.resultSummary}
                        size="sm"
                      />
                    ) : (
                      row.resultSummary
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">대진 미생성</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/events/${row.eventSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "field" }),
              "w-full sm:w-auto",
            )}
          >
            공개 공고
          </Link>
          {row.bracketGenerated ? (
            <Link
              href={`/events/${row.eventSlug}/brackets`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "field" }),
                "w-full sm:w-auto",
              )}
            >
              공개 대진표
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
