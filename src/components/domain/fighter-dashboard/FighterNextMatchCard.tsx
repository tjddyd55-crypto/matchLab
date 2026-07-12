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
import type { FieldModeMatchCardVM } from "@/lib/services/match.service";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/fighter-dashboard-ui";
import { cn } from "@/lib/utils";

export function FighterNextMatchCard({ match }: { match: FieldModeMatchCardVM }) {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base leading-snug">
              {match.eventTitle}
            </CardTitle>
            <CardDescription>
              {match.bracketTitle}
              {match.roundName ? ` · ${match.roundName}` : ""}
            </CardDescription>
          </div>
          <MatchonStatusBadge
            status={resolveBracketMatchMatchonStatus(match.status)}
            label={getBracketMatchMatchonLabel(match.status)}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 rounded-lg border bg-muted/15 p-3 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px] font-medium">나</p>
            <p className="truncate text-sm font-semibold">내 경기</p>
          </div>
          <span className="text-muted-foreground text-xs font-bold tracking-widest">
            VS
          </span>
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px] font-medium">상대</p>
            <p className="truncate text-sm font-semibold">
              {match.opponentName ?? "미정"}
            </p>
            {match.opponentGymName ? (
              <p className="text-muted-foreground truncate text-xs">
                {match.opponentGymName}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">매트·번호</dt>
            <dd className="text-right tabular-nums">
              매트 {match.matNumber ?? "—"} · 전역 #{match.globalMatchOrder ?? "—"}{" "}
              · 순번 {match.matchOrder}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">공식 결과</dt>
            <dd>
              <MatchonStatusBadge
                status={
                  match.hasOfficialResults
                    ? "application_completed"
                    : "application_pending"
                }
                label={match.hasOfficialResults ? "확정됨" : "미확정"}
                size="sm"
              />
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/fighter/events"
            className={cn(buttonVariants({ size: "field" }), "w-full sm:w-auto")}
          >
            내 대회·경기 전체
          </Link>
          <Link
            href={`/events/${match.publicSlug}/brackets`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "field" }),
              "w-full sm:w-auto",
            )}
          >
            공개 대진표 보기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function FighterNextMatchEmptyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">내 다음 경기</CardTitle>
        <CardDescription>
          예정된 진행 중 경기가 없습니다. 시연 시드에서는 배정된 카드가 없을 수
          있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href="/fighter/events"
          className={cn(buttonVariants({ size: "field" }), "w-full sm:w-auto")}
        >
          내 대회·경기
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
  );
}
