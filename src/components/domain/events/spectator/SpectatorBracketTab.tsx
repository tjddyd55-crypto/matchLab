import type {
  PublicBracketDetailDTO,
  PublicUnmatchedCandidateDTO,
} from "@/lib/dto/public";
import { PublicBracketRealtimeBridge } from "@/components/domain/brackets/PublicBracketRealtimeBridge";
import { DivisionInfoChips } from "@/components/domain/shared/DivisionInfoChips";
import { SpectatorMatchCard } from "@/components/domain/events/spectator/SpectatorMatchCard";
import { SpectatorWatchEmptyState } from "@/components/domain/events/spectator/SpectatorWatchEmptyState";

export function SpectatorBracketTab({
  eventId,
  slug,
  brackets,
}: {
  eventId: string;
  slug: string;
  brackets: PublicBracketDetailDTO[];
  unmatchedCandidates?: PublicUnmatchedCandidateDTO[];
}) {
  const bracketIds = brackets.map((b) => b.id);

  if (brackets.length === 0) {
    return (
      <SpectatorWatchEmptyState
        title="아직 공개된 대진표가 없습니다."
        description="주최자가 대진표를 공개하면 이곳에서 확인할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PublicBracketRealtimeBridge
        eventId={eventId}
        slug={slug}
        bracketIds={bracketIds}
      />
      {brackets.map((bracket) => {
        const sorted = bracket.matches;
        return (
          <section key={bracket.id} className="space-y-3">
            <div className="space-y-2">
              <h2 className="text-base font-semibold">{bracket.displayTitle}</h2>
              {bracket.division ? (
                <DivisionInfoChips division={bracket.division} />
              ) : null}
            </div>
            <div className="flex flex-col gap-4">
              {sorted.map((match) => (
                <SpectatorMatchCard
                  key={match.id}
                  match={match}
                  division={bracket.division}
                  bracketType={bracket.type}
                  bracketIsPublic={match.matchIsPublicSparring}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
