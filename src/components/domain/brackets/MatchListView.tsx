import type { PublicBracketDetailDTO } from "@/lib/dto/public";
import { BracketMatchCard } from "@/components/domain/brackets/BracketMatchCard";
import { sortMatchesByOrder } from "@/lib/match-order-display";

export function MatchListView({ bracket }: { bracket: PublicBracketDetailDTO }) {
  const sorted = sortMatchesByOrder(bracket.matches);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">{bracket.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          경기 목록형 ·{" "}
          {bracket.divisionLabel ?? "경기구분 정보 없음"}
        </p>
      </header>
      <div className="flex flex-col gap-4">
        {sorted.map((m) => (
          <BracketMatchCard
            key={m.id}
            match={m}
            divisionLabel={bracket.divisionLabel}
            matPrefix="매트 "
          />
        ))}
      </div>
    </section>
  );
}
