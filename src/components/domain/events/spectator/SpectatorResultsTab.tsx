import type { PublicMatchResultDTO } from "@/lib/dto/public";
import { PublicResultsRealtimeBridge } from "@/components/domain/results/PublicResultsRealtimeBridge";
import { SpectatorResultCard } from "@/components/domain/events/spectator/SpectatorResultCard";
import { SpectatorWatchEmptyState } from "@/components/domain/events/spectator/SpectatorWatchEmptyState";
import { compareMatchOrder } from "@/lib/match-order-display";

function sortResults(results: PublicMatchResultDTO[]): PublicMatchResultDTO[] {
  return [...results].sort((a, b) => {
    const orderA = {
      matchNumber: a.matchNumber,
      globalMatchOrder: null,
      matchOrder: 0,
    };
    const orderB = {
      matchNumber: b.matchNumber,
      globalMatchOrder: null,
      matchOrder: 0,
    };
    return compareMatchOrder(orderA, orderB);
  });
}

export function SpectatorResultsTab({
  eventId,
  slug,
  results,
}: {
  eventId: string;
  slug: string;
  results: PublicMatchResultDTO[];
}) {
  if (results.length === 0) {
    return (
      <SpectatorWatchEmptyState
        title="아직 등록된 경기 결과가 없습니다."
        description="경기가 종료되면 결과가 이곳에 표시됩니다."
      />
    );
  }

  const sorted = sortResults(results);

  return (
    <div className="space-y-4">
      <PublicResultsRealtimeBridge eventId={eventId} slug={slug} bracketIds={[]} />
      {sorted.map((result) => (
        <SpectatorResultCard key={`${result.matchId}-${result.redFighter?.fighterId ?? result.fighter?.fighterId ?? "x"}`} result={result} />
      ))}
    </div>
  );
}
