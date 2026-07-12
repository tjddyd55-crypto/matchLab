"use client";

import Link from "next/link";
import { FighterApplicationCard } from "@/components/domain/fighter-dashboard/FighterApplicationCard";
import { FighterDashboardEmptyState } from "@/components/domain/fighter-dashboard/FighterDashboardEmptyState";
import { FighterMatchListCard } from "@/components/domain/fighter-dashboard/FighterMatchListCard";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FighterEventsPageDTO } from "@/lib/services/fighter-event-status.service";
import { cn } from "@/lib/utils";

export function FighterEventsBoard({ data }: { data: FighterEventsPageDTO }) {
  if (data.applications.length === 0) {
    return (
      <FighterDashboardEmptyState
        title="아직 신청한 대회가 없습니다"
        description="선수 프로필이 이 계정에 연결되어 있고, 체육관이 대회에 신청한 경우에만 목록이 나타납니다."
        action={
          <Link href="/fighter" className={cn(buttonVariants({ size: "field" }))}>
            선수 홈으로
          </Link>
        }
      />
    );
  }

  const unpaidCount = data.applications.filter(
    (row) => row.paymentDisplayLabel === "체육관/주최자 확인 중",
  ).length;
  const pendingApprovalCount = data.applications.filter(
    (row) => row.applicationStatus === "pending",
  ).length;

  return (
    <div className="flex flex-col gap-8">
      {unpaidCount > 0 || pendingApprovalCount > 0 ? (
        <Card variant="muted" className="gap-0 py-0">
          <div className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">해야 할 일</h2>
            {pendingApprovalCount > 0 ? (
              <FeedbackMessage tone="info" className="text-sm">
                승인 대기 중인 신청이 {pendingApprovalCount}건 있습니다. 체육관 또는
                주최자 확인을 기다려 주세요.
              </FeedbackMessage>
            ) : null}
            {unpaidCount > 0 ? (
              <FeedbackMessage tone="warning" className="text-sm">
                입금 확인이 필요한 신청이 {unpaidCount}건 있습니다. 소속 체육관에
                입금 안내를 확인해 주세요.
              </FeedbackMessage>
            ) : null}
          </div>
        </Card>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">내 신청 대회</h2>
        <ul className="flex flex-col gap-3">
          {data.applications.map((row) => (
            <li key={row.applicationId}>
              <FighterApplicationCard row={row} />
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
                <FighterMatchListCard match={m} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FeedbackMessage tone="info" className="text-xs leading-relaxed">
        신청 정보는 체육관 또는 주최자가 관리합니다. 문의가 필요하면 소속 체육관에
        문의하세요.
      </FeedbackMessage>
    </div>
  );
}
