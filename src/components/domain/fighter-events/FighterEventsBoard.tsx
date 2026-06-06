"use client";

import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FighterEventsPageDTO } from "@/lib/services/fighter-event-status.service";
import { cn } from "@/lib/utils";

export function FighterEventsBoard({ data }: { data: FighterEventsPageDTO }) {
  if (data.applications.length === 0) {
    return (
      <EmptyState
        title="표시할 신청이 없습니다"
        description="선수 프로필이 이 계정에 연결되어 있고, 체육관이 대회에 신청한 경우에만 목록이 나타납니다."
        action={
          <Link href="/fighter" className={cn(buttonVariants({ size: "sm" }))}>
            선수 홈으로
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">내 신청 대회</h2>
        <ul className="flex flex-col gap-3">
          {data.applications.map((row) => (
            <li key={row.applicationId}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug">
                    {row.eventTitle}
                  </CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {row.divisionLabel} · 소속 {row.gymName}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <ApplicationStatusBadge status={row.applicationStatus} />
                    <StatusBadge variant="secondary" label={row.paymentDisplayLabel} />
                    <StatusBadge variant="outline" label={row.checkInStatusLabel} />
                    <StatusBadge variant="outline" label={row.weighInStatusLabel} />
                    <EligibilityBadge
                      label={row.eligibilityLabel}
                      isEligible={row.isEligibleForBracket}
                    />
                  </div>
                  {row.bracketGenerated ? (
                    <dl className="grid gap-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">대진</dt>
                        <dd>{row.bracketAssigned ? "배정됨" : "미배정"}</dd>
                      </div>
                      {row.opponentName ? (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">상대</dt>
                          <dd className="text-right">
                            {row.opponentName}
                            {row.opponentGymName
                              ? ` (${row.opponentGymName})`
                              : ""}
                          </dd>
                        </div>
                      ) : null}
                      {row.matchNumber != null || row.globalMatchOrder != null ? (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">경기 순서</dt>
                          <dd>
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
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">결과</dt>
                          <dd>{row.resultSummary}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className="text-muted-foreground text-xs">대진 미생성</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/events/${row.eventSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
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
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                      >
                        공개 대진표
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {data.matches.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">내 경기</h2>
          <ul className="flex flex-col gap-3">
            {data.matches.map((m) => (
              <li key={m.matchId}>
                <Card>
                  <CardContent className="flex flex-col gap-2 p-4 text-sm">
                    <div className="font-medium">{m.eventTitle}</div>
                    <div className="text-muted-foreground text-xs">
                      {m.divisionLabel} · {m.bracketTitle}
                    </div>
                    <dl className="grid gap-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">상대</dt>
                        <dd>
                          {m.opponentName ?? "미정"}
                          {m.opponentGymName ? ` (${m.opponentGymName})` : ""}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">경기 순서</dt>
                        <dd>
                          {m.matchNumber != null ? `#${m.matchNumber}` : "—"}
                          {m.globalMatchOrder != null
                            ? ` · 전역 ${m.globalMatchOrder}`
                            : ""}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">상태</dt>
                        <dd>{m.matchStatusLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">결과</dt>
                        <dd>{m.resultSummary ?? "—"}</dd>
                      </div>
                    </dl>
                    <Link
                      href={`/events/${m.publicSlug}/brackets`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-1 w-fit",
                      )}
                    >
                      공개 대진표 보기
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs leading-relaxed">
        신청 정보는 체육관 또는 주최자가 관리합니다. 문의가 필요하면 소속
        체육관에 문의하세요.
      </p>
    </div>
  );
}
