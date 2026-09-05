import type { PublicBracketDetailDTO } from "@/lib/dto/public";
import { PublicBracketRealtimeBridge } from "@/components/domain/brackets/PublicBracketRealtimeBridge";
import { SpectatorMatchCard } from "@/components/domain/events/spectator/SpectatorMatchCard";
import { SpectatorWatchEmptyState } from "@/components/domain/events/spectator/SpectatorWatchEmptyState";
import { flattenPublicBracketsForSpectator } from "@/lib/public-bracket-global-order";

export function SpectatorBracketTab({
  eventId,
  slug,
  brackets,
}: {
  eventId: string;
  slug: string;
  brackets: PublicBracketDetailDTO[];
}) {
  if (brackets.length === 0) {
    return (
      <SpectatorWatchEmptyState
        title="아직 공개된 대진표가 없습니다."
        description="주최자가 대진표를 공개하면 이곳에서 확인할 수 있습니다."
      />
    );
  }

  const bracketIds = brackets.map((b) => b.id);
  const matches = flattenPublicBracketsForSpectator(brackets);

  return (
    <div className="space-y-4">
      <PublicBracketRealtimeBridge
        eventId={eventId}
        slug={slug}
        bracketIds={bracketIds}
      />
      <div className="flex flex-col gap-4">
        {matches.map((entry) => (
          <SpectatorMatchCard
            key={entry.match.id}
            match={entry.match}
            division={entry.division}
            divisionLabel={entry.divisionLabel}
            bracketType={entry.bracketType}
            bracketIsPublic={entry.bracketIsPublicSparring}
          />
        ))}
      </div>
    </div>
  );
}
