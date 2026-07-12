import { BracketType } from "@/lib/enums";
import type {
  PublicBracketDetailDTO,
  PublicUnmatchedCandidateDTO,
} from "@/lib/dto/public";
import { PublicUnmatchedListSection } from "@/components/domain/brackets/PublicUnmatchedListSection";
import { MatchListView } from "@/components/domain/brackets/MatchListView";
import { PublicBracketRealtimeBridge } from "@/components/domain/brackets/PublicBracketRealtimeBridge";
import { TournamentBracketView } from "@/components/domain/brackets/TournamentBracketView";
import { PublicSpectatorEmptyState } from "@/components/domain/events/public/PublicSpectatorEmptyState";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PublicEventBracketsSection({
  eventId,
  slug,
  brackets,
  unmatchedCandidates = [],
  publicUnmatchedListEnabled = false,
}: {
  eventId: string;
  slug: string;
  brackets: PublicBracketDetailDTO[];
  unmatchedCandidates?: PublicUnmatchedCandidateDTO[];
  publicUnmatchedListEnabled?: boolean;
}) {
  const bracketIds = brackets.map((b) => b.id);
  const showUnmatched =
    publicUnmatchedListEnabled && unmatchedCandidates.length > 0;

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <PublicBracketRealtimeBridge
        eventId={eventId}
        slug={slug}
        bracketIds={bracketIds}
      />

      <Card variant="muted" className="py-4">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">공개 대진표</CardTitle>
          <CardDescription>
            주최자가 공개한 대진표만 표시됩니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {brackets.length === 0 ? (
        <PublicSpectatorEmptyState
          title="아직 공개된 대진표가 없습니다"
          description="대진표가 공개되면 이 화면에서 확인할 수 있습니다."
          tone="info"
        />
      ) : (
        <div className="flex w-full flex-col gap-12 md:gap-16">
          {brackets.map((b) =>
            b.type === BracketType.match_list ? (
              <MatchListView key={b.id} bracket={b} />
            ) : (
              <TournamentBracketView key={b.id} bracket={b} />
            ),
          )}
        </div>
      )}

      {showUnmatched ? (
        <PublicUnmatchedListSection candidates={unmatchedCandidates} />
      ) : null}
    </div>
  );
}
