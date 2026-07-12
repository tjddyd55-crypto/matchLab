import type { PublicBracketDetailDTO } from "@/lib/dto/public";
import { BracketMatchCard } from "@/components/domain/brackets/BracketMatchCard";
import { BracketGroupHeader } from "@/components/domain/brackets/BracketGroupHeader";
import { sortMatchesByOrder } from "@/lib/match-order-display";

export function MatchListView({ bracket }: { bracket: PublicBracketDetailDTO }) {
  const sorted = sortMatchesByOrder(bracket.matches);

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <BracketGroupHeader
          division={bracket.division}
          fallbackTitle={bracket.displayTitle}
        />
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
