import { FighterAvatar } from "@/components/shared/FighterAvatar";
import { PublicResultsRealtimeBridge } from "@/components/domain/results/PublicResultsRealtimeBridge";
import type { PublicMatchResultDTO } from "@/lib/dto/public";
import { MatchRecordOutcome } from "@/lib/enums";

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

function groupResults(results: PublicMatchResultDTO[]) {
  const grouped = new Map<string, PublicMatchResultDTO[]>();
  for (const r of results) {
    const key = `${r.bracketTitle}|||${r.divisionLabel ?? ""}`;
    const arr = grouped.get(key) ?? [];
    arr.push(r);
    grouped.set(key, arr);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function PublicEventResultsSection({
  eventId,
  slug,
  eventTitle,
  results,
}: {
  eventId: string;
  slug: string;
  eventTitle: string;
  results: PublicMatchResultDTO[];
}) {
  const sections = groupResults(results);

  return (
    <div className="flex flex-col gap-6">
      <PublicResultsRealtimeBridge
        eventId={eventId}
        slug={slug}
        bracketIds={[]}
      />
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
          공식 결과
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{eventTitle}</p>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          확정된 MatchResult만 표시합니다. 휴대폰·생년월일 등 개인정보는 공개하지
          않습니다.
        </p>
      </div>

      {results.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm">
          아직 공개된 경기 결과가 없습니다.
        </p>
      ) : (
        <div className="flex w-full flex-col gap-12">
          {sections.map(([key, rows]) => {
            const [bracketTitle, divisionLabel] = key.split("|||");
            return (
              <section key={key} className="w-full space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{bracketTitle}</h3>
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
    </div>
  );
}
