import type { PublicBracketDetailDTO } from "@/lib/dto/public";
import { BracketMatchCard } from "@/components/domain/brackets/BracketMatchCard";
import { DivisionInfoChips } from "@/components/domain/shared/DivisionInfoChips";
import { sortMatchesByOrder } from "@/lib/match-order-display";

export function MatchListView({ bracket }: { bracket: PublicBracketDetailDTO }) {
  const sorted = sortMatchesByOrder(bracket.matches);

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">{bracket.displayTitle}</h2>
        {bracket.division ? (
          <DivisionInfoChips division={bracket.division} />
        ) : (
          <p className="text-muted-foreground text-sm">경기구분 정보 없음</p>
        )}
      </header>
      <div className="flex flex-col gap-4">
        {sorted.map((m) => (
          <BracketMatchCard
            key={m.id}
            match={m}
            division={bracket.division}
            matPrefix="매트 "
            bracketType={bracket.type}
            bracketIsPublic={m.matchIsPublicSparring}
            resultMemo={null}
            operationalSettingsLabel={m.operationalSettingsLabel}
            compactDivision
          />
        ))}
      </div>
    </section>
  );
}
