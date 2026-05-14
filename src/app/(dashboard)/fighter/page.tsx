import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireActor } from "@/lib/auth/actor";
import { notificationService } from "@/lib/services/notification.service";
import { matchService } from "@/lib/services/match.service";
import { BracketMatchStatus } from "@/lib/enums";

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

export default async function FighterHomePage() {
  const actor = await requireActor();
  const field = await matchService.getFighterFieldMode(actor);
  const alerts = await notificationService.listMyNotifications(actor);

  const next = field.next;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          현장 모드
        </h1>
        <p className="text-muted-foreground text-sm">
          진행 예정 경기와 알림 요약입니다. 전적 숫자는 서버 확정 결과만 반영합니다.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">내 다음 경기</h2>
        {!next ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              예정된 진행 중 경기가 없습니다. 시연 시드에서는 배정된 카드가
              없을 수 있습니다.
            </p>
            <Link
              href="/fighter/records"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              전적 보기
            </Link>
          </div>
        ) : (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">대회</dt>
              <dd className="text-right font-medium">{next.eventTitle}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">대진표</dt>
              <dd className="text-right">{next.bracketTitle}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">라운드</dt>
              <dd className="text-right">{next.roundName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">상대</dt>
              <dd className="text-right">
                {next.opponentName ?? "미정"}
                {next.opponentGymName ? ` (${next.opponentGymName})` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">매트·번호</dt>
              <dd className="text-right">
                매트 {next.matNumber ?? "—"} · 전역 #
                {next.globalMatchOrder ?? "—"} · 순번 {next.matchOrder}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">상태</dt>
              <dd className="text-right">{statusKo(next.status)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">공식 결과</dt>
              <dd className="text-right">
                {next.hasOfficialResults ? "확정됨" : "미확정"}
              </dd>
            </div>
            <div className="pt-2">
              <Link
                href={`/events/${next.publicSlug}/brackets`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                공개 대진표 보기
              </Link>
            </div>
          </dl>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">알림 요약</h2>
          <Link
            href="/notifications"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            전체
          </Link>
        </div>
        {alerts.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            알림이 없습니다. 주최자 측 이벤트 알림이 등록되면 여기에 표시됩니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {alerts.items.slice(0, 5).map((n) => (
              <li key={n.id} className="border-b pb-2 last:border-none">
                <div className="font-medium">{n.title}</div>
                <div className="text-muted-foreground text-xs">{n.content}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
