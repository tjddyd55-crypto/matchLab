import type { PublicEventDivisionDTO } from "@/lib/dto/public";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { formatDivisionSportTitle } from "@/lib/event-division-fields";

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

  const sportTitles = [
    ...new Set(
      divisions
        .map((d) => formatDivisionSportTitle(d))
        .filter((x): x is string => Boolean(x)),
    ),
  ];

  return (
    <>
      {sportTitles.length === 1 ? (
        <p className="text-muted-foreground mb-3 text-sm font-medium">
          {sportTitles[0]}
        </p>
      ) : null}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 font-medium">경기구분 / 체급</th>
                {sportTitles.length !== 1 ? (
                  <th className="px-3 py-2 font-medium">종목</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {divisions.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <DivisionCompactDisplay
                      division={d}
                      secondaryClassName="hidden"
                    />
                  </td>
                  {sportTitles.length !== 1 ? (
                    <td className="text-muted-foreground px-3 py-2">
                      {formatDivisionSportTitle(d) ?? "—"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {divisions.map((d) => (
          <li
            key={d.id}
            className="ring-foreground/10 space-y-1 rounded-xl bg-card p-3 text-sm ring-1"
          >
            <DivisionCompactDisplay
              division={d}
              secondaryClassName={
                sportTitles.length === 1 ? "hidden" : undefined
              }
            />
          </li>
        ))}
      </ul>
    </>
  );
}
