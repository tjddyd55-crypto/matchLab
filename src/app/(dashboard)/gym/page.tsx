import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireActor } from "@/lib/auth/actor";
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

export default async function GymHomePage() {
  const actor = await requireActor();
  const field = await matchService.getGymFieldMode(actor);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          현장 모드
        </h1>
        <p className="text-muted-foreground text-sm">
          소속 선수의 진행 예정 경기와 신청·입금 요약입니다.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">바로가기</h2>
        <div className="flex flex-wrap gap-2">
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
            대회 신청
          </Link>
          <Link
            href="/gym/records"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            소속 전적
          </Link>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">신청·입금 요약</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">승인 대기 신청</dt>
            <dd className="font-medium">
              {field.applicationAttention.pendingApproval}건
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              승인됐으나 입금 미완료·확인중
            </dt>
            <dd className="font-medium">
              {field.applicationAttention.approvedPaymentIncomplete}건
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          <Link
            href="/gym/applications"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            신청 관리
          </Link>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">우리 선수 진행 예정 경기</h2>
        {field.upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            진행 예정 경기가 없습니다. 시드 데이터가 있으면 공개 대진표에서
            배정된 경기가 표시됩니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-4 text-sm">
            {field.upcoming.map((m) => (
              <li
                key={m.matchId}
                className="ring-foreground/10 rounded-lg border px-3 py-3"
              >
                <div className="font-medium">{m.eventTitle}</div>
                <div className="text-muted-foreground text-xs">
                  {m.bracketTitle} · {m.roundName ?? "라운드 미상"}
                </div>
                <div className="mt-2 grid gap-1">
                  <div>
                    선수{" "}
                    <span className="font-medium">
                      {m.gymFighterName ?? "—"}
                    </span>{" "}
                    vs {m.opponentName ?? "미정"}{" "}
                    {m.opponentGymName ? `(${m.opponentGymName})` : ""}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    매트 {m.matNumber ?? "—"} · 번호 #
                    {m.globalMatchOrder ?? m.matchOrder} · 상태{" "}
                    {statusKo(m.status)} · 공식 결과{" "}
                    {m.hasOfficialResults ? "확정" : "미확정"}
                  </div>
                  <Link
                    href={`/events/${m.publicSlug}/brackets`}
                    className={cn(
                      buttonVariants({ variant: "link", size: "sm" }),
                      "h-auto px-0",
                    )}
                  >
                    공개 대진표
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
