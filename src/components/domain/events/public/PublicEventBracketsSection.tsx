import { BracketType } from "@/lib/enums";
import type {
  PublicBracketDetailDTO,
  PublicUnmatchedCandidateDTO,
} from "@/lib/dto/public";
import { PublicUnmatchedListSection } from "@/components/domain/brackets/PublicUnmatchedListSection";
import { MatchListView } from "@/components/domain/brackets/MatchListView";
import { PublicBracketRealtimeBridge } from "@/components/domain/brackets/PublicBracketRealtimeBridge";
import { TournamentBracketView } from "@/components/domain/brackets/TournamentBracketView";

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
    <div className="flex flex-col gap-10">
      <PublicBracketRealtimeBridge
        eventId={eventId}
        slug={slug}
        bracketIds={bracketIds}
      />
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
          공개 대진표
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          주최자가 공개한 대진표만 표시됩니다.
        </p>
      </div>

      {brackets.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm">
          대진표 준비 중입니다.
        </p>
      ) : (
        <div className="flex w-full flex-col gap-16">
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
