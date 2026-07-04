import type { PublicEventDivisionDTO } from "@/lib/dto/public";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { DivisionSportSectionHeader } from "@/components/domain/shared/DivisionSportSectionHeader";
import { groupItemsByDivisionSport } from "@/lib/division-sport-grouping";

export function PublicEventDivisionList({
  divisions,
}: {
  divisions: PublicEventDivisionDTO[];
}) {
  if (divisions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">등록된 경기구분이 없습니다.</p>
    );
  }

  const sportGroups = groupItemsByDivisionSport(divisions, (d) => d);

  return (
    <div className="space-y-6">
      {sportGroups.map((group) => (
        <section key={group.sportTitle} className="space-y-3">
          <DivisionSportSectionHeader title={group.sportTitle} />

          <div className="hidden md:block">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 font-medium">경기구분 / 체급</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <DivisionCompactDisplay division={d} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {group.items.map((d) => (
              <li
                key={d.id}
                className="ring-foreground/10 rounded-xl bg-card p-3 text-sm ring-1"
              >
                <DivisionCompactDisplay division={d} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
