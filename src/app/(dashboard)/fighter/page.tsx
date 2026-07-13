import Link from "next/link";
import {
  FighterNextMatchCard,
  FighterNextMatchEmptyCard,
} from "@/components/domain/fighter-dashboard/FighterNextMatchCard";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { requireFighterDashboardReady } from "@/lib/auth/fighter-dashboard-gate";
import { notificationService } from "@/lib/services/notification.service";
import { matchService } from "@/lib/services/match.service";
import { matchonPageHeaderStackClass } from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FighterHomePage() {
  const actor = await requireActor();
  await requireFighterDashboardReady(actor);
  const field = await matchService.getFighterFieldMode(actor);
  const alerts = await notificationService.listMyNotifications(actor);

  const next = field.next;

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-3xl")}>
        <header className={matchonPageHeaderStackClass}>
          <h1 className={matchonPageTitleClass}>선수 홈</h1>
          <p className={matchonPageDescClass}>
            진행 예정 경기와 알림 요약입니다. 신청·입금·대진 상태는 내 대회·경기에서
            확인할 수 있습니다.
          </p>
        </header>

        <Card variant="muted" className="gap-0 py-0">
          <CardHeader className="border-b border-matchon-border">
            <CardTitle className={matchonSectionTitleClass}>빠른 이동</CardTitle>
            <CardDescription>
              신청 내역, 프로필, 전적을 바로 확인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:flex-wrap">
            <Link
              href="/fighter/events"
              className={cn(buttonVariants({ size: "field" }), "w-full sm:w-auto")}
            >
              내 대회·경기
            </Link>
            <Link
              href="/fighter/profile"
              className={cn(
                buttonVariants({ variant: "outline", size: "field" }),
                "w-full sm:w-auto",
              )}
            >
              내 프로필
            </Link>
            <Link
              href="/fighter/records"
              className={cn(
                buttonVariants({ variant: "outline", size: "field" }),
                "w-full sm:w-auto",
              )}
            >
              전적 보기
            </Link>
          </CardContent>
        </Card>

        {next ? (
          <FighterNextMatchCard match={next} />
        ) : (
          <FighterNextMatchEmptyCard />
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className={matchonSectionTitleClass}>알림 요약</CardTitle>
            <Link
              href="/notifications"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              전체
            </Link>
          </CardHeader>
          <CardContent>
            {alerts.items.length === 0 ? (
              <FeedbackMessage tone="info" className="text-sm">
                알림이 없습니다. 주최자 측 이벤트 알림이 등록되면 여기에 표시됩니다.
              </FeedbackMessage>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {alerts.items.slice(0, 5).map((n) => (
                  <li
                    key={n.id}
                    className="border-b border-matchon-border pb-3 last:border-none last:pb-0"
                  >
                    <div className="font-medium">{n.title}</div>
                    <div className="text-muted-foreground text-xs">{n.content}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
