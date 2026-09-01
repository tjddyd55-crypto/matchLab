import Link from "next/link";
import type { PublicMyMatchPageDTO } from "@/lib/services/my-match.service";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
import { BracketMatchStatus } from "@/lib/enums";

function SpotlightCard({
  label,
  match,
}: {
  label: string;
  match: PublicMyMatchPageDTO["spotlight"]["current"];
}) {
  if (!match) return null;
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">
        {match.matchNumberLabel}
      </p>
      <p className="text-sm font-medium">
        {match.fighterRedName} vs {match.fighterBlueName}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{match.courtLabel}</p>
    </div>
  );
}

export function PublicMyMatchView({ data }: { data: PublicMyMatchPageDTO }) {
  const primary = data.matches.find((m) => m.isPrimary) ?? data.matches[0];

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">{data.eventTitle}</p>
        <h1 className="text-2xl font-bold tracking-tight">{data.fighterName}</h1>
        {data.gymName ? (
          <p className="text-muted-foreground text-sm">{data.gymName}</p>
        ) : null}
        {data.fighterProfileSlug ? (
          <Link
            href={`/fighters/${data.fighterProfileSlug}`}
            className="text-primary text-sm font-medium underline-offset-2 hover:underline"
          >
            선수 프로필 보기
          </Link>
        ) : null}
      </header>

      {data.courtLabel && primary ? (
        <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h2 className="text-sm font-bold">{data.courtLabel}</h2>
          {data.spotlight.currentMatchNumberLabel ? (
            <p className="text-base font-semibold">
              현재 {data.spotlight.currentMatchNumberLabel} 진행 중
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">현재 진행 중인 경기가 없습니다.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <SpotlightCard label="현재 경기" match={data.spotlight.current} />
            <SpotlightCard label="내 경기" match={data.spotlight.myMatch} />
          </div>

          {data.spotlight.matchesUntil != null &&
          primary.status !== BracketMatchStatus.finished &&
          primary.status !== BracketMatchStatus.cancelled ? (
            <p className="text-base font-bold text-primary">
              내 경기까지 {data.spotlight.matchesUntil}경기 남았습니다
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold">내 경기 목록</h2>
        <ul className="space-y-3">
          {data.matches.map((match) => (
            <li
              key={match.matchId}
              className="rounded-xl border bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold tabular-nums">{match.matchNumberLabel}</p>
                  <p className="text-muted-foreground text-xs">
                    {match.courtLabel} · {match.divisionLabel}
                  </p>
                </div>
                <MatchonStatusBadge
                  status={resolveBracketMatchMatchonStatus(match.status)}
                  label={getBracketMatchMatchonLabel(match.status)}
                  size="md"
                />
              </div>
              <p className="text-sm">
                상대:{" "}
                <span className="font-medium">
                  {match.opponentName ?? "—"}
                </span>
                {match.opponentGymName ? (
                  <span className="text-muted-foreground"> ({match.opponentGymName})</span>
                ) : null}
              </p>
              {match.outcomeLabel ? (
                <p className="text-sm font-semibold">
                  결과: {match.outcomeLabel}
                  {match.resultTypeLabel ? ` · ${match.resultTypeLabel}` : ""}
                </p>
              ) : match.status === BracketMatchStatus.finished ? (
                <p className="text-muted-foreground text-sm">경기 종료 · 결과 확인 중</p>
              ) : null}
              {match.isPrimary &&
              match.matchesUntil != null &&
              match.status !== BracketMatchStatus.finished &&
              match.status !== BracketMatchStatus.cancelled ? (
                <p className="text-primary text-sm font-medium">
                  이 경기장에서 {match.matchesUntil}경기 후
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
