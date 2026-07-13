import { PublicResultsRealtimeBridge } from "@/components/domain/results/PublicResultsRealtimeBridge";
import { PublicEventResultCard } from "@/components/domain/events/public/PublicEventResultCard";
import { PublicSpectatorEmptyState } from "@/components/domain/events/public/PublicSpectatorEmptyState";
import type { PublicMatchResultDTO } from "@/lib/dto/public";
import {
  publicEventPageEyebrowClass,
  publicEventPageTitleClass,
} from "@/components/domain/events/public/public-event-ui";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-8">
      <PublicResultsRealtimeBridge
        eventId={eventId}
        slug={slug}
        bracketIds={[]}
      />

      <header className="space-y-1">
        <p className={publicEventPageEyebrowClass}>Results</p>
        <h2 className={cn(publicEventPageTitleClass, "text-xl md:text-2xl")}>
          공식 결과
        </h2>
        <p className="text-sm text-matchon-text-secondary">
          {eventTitle} — 확정된 MatchResult만 표시합니다. 휴대폰·생년월일 등
          개인정보는 공개하지 않습니다.
        </p>
      </header>

      {results.length === 0 ? (
        <PublicSpectatorEmptyState
          title="아직 공개된 경기 결과가 없습니다"
          description="경기가 종료되고 결과가 확정되면 이 화면에 표시됩니다."
          tone="info"
        />
      ) : (
        <div className="flex w-full flex-col gap-10">
          {sections.map(([key, rows]) => {
            const [bracketTitle, divisionLabel] = key.split("|||");
            return (
              <section key={key} className="w-full space-y-4">
                <header>
                  <h3 className="text-lg font-bold text-matchon-text-primary md:text-xl">
                    {bracketTitle}
                  </h3>
                  <p className="text-sm text-matchon-text-secondary">
                    {(divisionLabel ?? "").trim()
                      ? `경기구분 ${divisionLabel}`
                      : "경기구분 정보 없음"}
                  </p>
                </header>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {rows.map((r) => (
                    <PublicEventResultCard
                      key={`${r.matchId}-${r.fighter?.fighterId ?? "x"}`}
                      result={r}
                    />
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
