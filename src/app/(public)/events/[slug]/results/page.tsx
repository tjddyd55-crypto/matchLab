import { notFound } from "next/navigation";
import { FighterAvatar } from "@/components/shared/FighterAvatar";
import { PublicResultsRealtimeBridge } from "@/components/domain/results/PublicResultsRealtimeBridge";
import { PUBLIC_EVENT_DETAIL_PAGE_CLASS } from "@/components/domain/events/public/public-event-layout";
import { PublicEventSubpageHeader } from "@/components/domain/events/public/PublicEventSubpageHeader";
import type { PublicMatchResultDTO } from "@/lib/dto/public";
import { MatchRecordOutcome } from "@/lib/enums";
import { eventService } from "@/lib/services/event.service";
import { resultService } from "@/lib/services/result.service";

export const dynamic = "force-dynamic";

function outcomeKo(o: MatchRecordOutcome): string {
  switch (o) {
    case MatchRecordOutcome.win:
      return "승";
    case MatchRecordOutcome.loss:
      return "패";
    case MatchRecordOutcome.draw:
      return "무";
    case MatchRecordOutcome.no_contest:
      return "노콘";
    default:
      return String(o);
  }
}

export default async function PublicEventResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  const payload = await resultService.getPublicResultsByEventSlug(slug);
  if (!payload || !event) {
    notFound();
  }

  const grouped = new Map<string, PublicMatchResultDTO[]>();
  for (const r of payload.results) {
    const key = `${r.bracketTitle}|||${r.divisionLabel ?? ""}`;
    const arr = grouped.get(key) ?? [];
    arr.push(r);
    grouped.set(key, arr);
  }

  const sections = [...grouped.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <main className={PUBLIC_EVENT_DETAIL_PAGE_CLASS}>
      <PublicResultsRealtimeBridge
        eventId={event.id}
        slug={slug}
        bracketIds={[]}
      />
      <PublicEventSubpageHeader
        slug={slug}
        title="공식 결과"
        eventTitle={payload.eventTitle}
        description="확정된 MatchResult만 표시합니다. 휴대폰·생년월일 등 개인정보는 공개하지 않습니다."
      />

      {payload.results.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          아직 공개할 확정 결과가 없습니다.
        </p>
      ) : (
        <div className="flex w-full flex-col gap-12">
          {sections.map(([key, rows]) => {
            const [bracketTitle, divisionLabel] = key.split("|||");
            return (
              <section key={key} className="w-full space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{bracketTitle}</h2>
                  <p className="text-muted-foreground text-sm">
                    {(divisionLabel ?? "").trim()
                      ? `부문 ${divisionLabel}`
                      : "부문 정보 없음"}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-4">
                  {rows.map((r) => (
                    <article
                      key={`${r.matchId}-${r.fighter?.fighterId ?? "x"}`}
                      className="ring-foreground/10 w-full rounded-xl border bg-card p-4 shadow-sm"
                    >
                      <div className="text-muted-foreground mb-3 flex flex-wrap gap-2 text-xs">
                        <span>
                          경기 #
                          {r.matchNumber ?? r.matchId.slice(-6)}
                        </span>
                        {r.matNumber != null ? (
                          <span>매트 {r.matNumber}</span>
                        ) : null}
                        <span>
                          {new Date(r.matchDate).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <FighterAvatar
                              src={r.fighter?.profileImageUrl ?? null}
                              name={r.fighter?.name ?? "선수"}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {r.fighter?.name ?? "—"}
                              </div>
                              <div className="text-muted-foreground truncate text-xs">
                                {r.fighter?.gymName ?? "소속 미상"} ·{" "}
                                {r.fighter?.fighterCode ?? ""}
                              </div>
                            </div>
                          </div>
                          <div className="text-muted-foreground hidden px-2 text-xs font-semibold md:block">
                            VS
                          </div>
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <FighterAvatar
                              src={r.opponent?.profileImageUrl ?? null}
                              name={r.opponent?.name ?? "상대"}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {r.opponent?.name ?? "—"}
                              </div>
                              <div className="text-muted-foreground truncate text-xs">
                                {r.opponent?.gymName ?? "소속 미상"} ·{" "}
                                {r.opponent?.fighterCode ?? ""}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm md:text-right">
                          <div className="font-semibold">
                            기록 관점: {outcomeKo(r.result)}
                          </div>
                          {r.resultTypeLabel ? (
                            <div className="text-muted-foreground text-xs">
                              결방식 {r.resultTypeLabel}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
