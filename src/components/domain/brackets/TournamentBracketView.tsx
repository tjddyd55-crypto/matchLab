import type {
  PublicBracketDetailDTO,
  PublicBracketMatchDTO,
} from "@/lib/dto/public";

import { BracketMatchCard } from "@/components/domain/brackets/BracketMatchCard";
import { DivisionInfoChips } from "@/components/domain/shared/DivisionInfoChips";

function groupMatchesByRound(matches: PublicBracketMatchDTO[]) {
  const map = new Map<number, PublicBracketMatchDTO[]>();
  for (const m of matches) {
    const key = m.round ?? -1;
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  const keys = [...map.keys()].sort((a, b) => a - b);
  return keys.map((k) => ({
    key: k,
    label:
      map.get(k)?.find((x) => x.roundName)?.roundName ??
      (k === -1 ? "라운드 미지정" : `${k}라운드`),
    matches: map.get(k)!,
  }));
}

export function TournamentBracketView({
  bracket,
}: {
  bracket: PublicBracketDetailDTO;
}) {
  const columns = groupMatchesByRound(bracket.matches);

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

      <div className="flex gap-4 overflow-x-auto pb-3 md:gap-6">
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex w-[min(100vw-2rem,320px)] shrink-0 flex-col gap-3 md:w-72"
          >
            <h3 className="border-border bg-muted/40 text-foreground sticky left-0 rounded-lg border px-3 py-2 text-sm font-semibold">
              {col.label}
            </h3>
            <div className="flex flex-col gap-3">
              {col.matches.map((m) => (
                <BracketMatchCard
                  key={m.id}
                  match={m}
                  division={bracket.division}
                  matPrefix="매트 "
                  bracketType={bracket.type}
                  bracketIsPublic={m.matchIsPublicSparring}
                  operationalSettingsLabel={m.operationalSettingsLabel}
                  compactDivision
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
