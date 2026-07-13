import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { matchService } from "@/lib/services/match.service";
import { BracketMatchStatus } from "@/lib/enums";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import {
  matchonBlueCornerPanelClass,
  matchonBlueCornerTextClass,
  matchonCompactActionBarClass,
  matchonRedCornerPanelClass,
  matchonRedCornerTextClass,
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
  matchonStatsGridClass,
  matchonVsCardClass,
} from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusKo(s: BracketMatchStatus): string {
  switch (s) {
    case BracketMatchStatus.waiting:
      return "대기";
    case BracketMatchStatus.called:
      return "호명";
    case BracketMatchStatus.ongoing:
      return "진행 중";
    case BracketMatchStatus.delayed:
      return "지연";
    case BracketMatchStatus.finished:
      return "종료";
    case BracketMatchStatus.cancelled:
      return "취소";
    default:
      return String(s);
  }
}

function resolveMatchStatusMatchon(status: BracketMatchStatus): MatchonStatus {
  switch (status) {
    case BracketMatchStatus.ongoing:
      return "in_progress";
    case BracketMatchStatus.finished:
      return "completed";
    case BracketMatchStatus.cancelled:
      return "cancelled";
    case BracketMatchStatus.delayed:
      return "application_pending";
    default:
      return "waiting";
  }
}

function GymProfileShell({ children }: { children: ReactNode }) {
  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>{children}</div>
    </div>
  );
}

export default async function GymHomePage() {
  const actor = await requireActor();

  if (!actor.gymId) {
    return (
      <GymProfileShell>
        <GymProfileMissingBanner />
      </GymProfileShell>
    );
  }

  let field: Awaited<ReturnType<typeof matchService.getGymFieldMode>>;
  try {
    field = await matchService.getGymFieldMode(actor);
  } catch (e) {
    if (e instanceof AppError && e.code === "FORBIDDEN") {
      return (
        <GymProfileShell>
          <GymProfileMissingBanner />
        </GymProfileShell>
      );
    }
    throw e;
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>현장 모드</h1>
          <p className={matchonPageDescClass}>
            소속 선수의 진행 예정 경기와 신청·입금 요약입니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className={matchonSectionTitleClass}>바로가기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={matchonCompactActionBarClass}>
              <Link
                href="/gym/fighters"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                선수
              </Link>
              <Link
                href="/gym/invite-links"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                초대 링크
              </Link>
              <Link
                href="/gym/events"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                대회·신청 현황
              </Link>
              <Link
                href="/gym/records"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                소속 전적
              </Link>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className={matchonSectionTitleClass}>신청·입금 요약</h2>
          <div className={matchonStatsGridClass}>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>승인 대기 신청</p>
              <p className={matchonStatValueClass}>
                {field.applicationAttention.pendingApproval}
              </p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>승인·입금 미완료</p>
              <p className={matchonStatValueClass}>
                {field.applicationAttention.approvedPaymentIncomplete}
              </p>
            </div>
          </div>
          <Link
            href="/gym/applications"
            className={cn(buttonVariants({ variant: "outline", size: "field" }), "w-fit")}
          >
            신청 관리
          </Link>
        </section>

        <section className="space-y-4">
          <h2 className={matchonSectionTitleClass}>우리 선수 진행 예정 경기</h2>
          {field.upcoming.length === 0 ? (
            <MatchonEmptyState
              title="진행 예정 경기가 없습니다"
              description="시드 데이터가 있으면 공개 대진표에서 배정된 경기가 표시됩니다."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {field.upcoming.map((m) => (
                <li key={m.matchId}>
                  <div className={cn(matchonVsCardClass, "overflow-hidden p-0")}>
                    <div className="space-y-1 border-b border-matchon-border bg-matchon-primary-light/20 px-4 py-3">
                      <p className="font-semibold text-matchon-text-primary">
                        {m.eventTitle}
                      </p>
                      <p className="text-matchon-text-secondary text-xs">
                        {m.bracketTitle} · {m.roundName ?? "라운드 미상"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <MatchonStatusBadge
                          status={resolveMatchStatusMatchon(m.status)}
                          label={statusKo(m.status)}
                          size="sm"
                        />
                        <span className="text-matchon-text-secondary text-xs">
                          매트 {m.matNumber ?? "—"} · #
                          {m.globalMatchOrder ?? m.matchOrder}
                        </span>
                        <span className="text-matchon-text-secondary text-xs">
                          공식 결과 {m.hasOfficialResults ? "확정" : "미확정"}
                        </span>
                      </div>
                    </div>
                    <div className="grid items-stretch gap-2 p-4 sm:grid-cols-[1fr_auto_1fr]">
                      <div className={matchonRedCornerPanelClass}>
                        <p className="text-xs font-semibold text-red-700/80">홍코너</p>
                        <p className={cn(matchonRedCornerTextClass, "mt-1 break-words")}>
                          {m.gymFighterName ?? "—"}
                        </p>
                      </div>
                      <span className="self-center px-1 text-sm font-black text-matchon-text-secondary">
                        VS
                      </span>
                      <div className={matchonBlueCornerPanelClass}>
                        <p className="text-xs font-semibold text-blue-700/80">청코너</p>
                        <p className={cn(matchonBlueCornerTextClass, "mt-1 break-words")}>
                          {m.opponentName ?? "미정"}
                        </p>
                        {m.opponentGymName ? (
                          <p className="mt-1 text-xs text-blue-700/70">
                            {m.opponentGymName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="border-t border-matchon-border px-4 py-3">
                      <Link
                        href={`/events/${m.publicSlug}/brackets`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                      >
                        공개 대진표
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
