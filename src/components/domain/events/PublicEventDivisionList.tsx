import type { PublicEventDivisionDTO } from "@/lib/dto/public";

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

  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 font-medium">종목</th>
                <th className="px-3 py-2 font-medium">룰</th>
                <th className="px-3 py-2 font-medium">성별</th>
                <th className="px-3 py-2 font-medium">연령</th>
                <th className="px-3 py-2 font-medium">체급</th>
                <th className="px-3 py-2 font-medium">급수</th>
              </tr>
            </thead>
            <tbody>
              {divisions.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{d.sportType}</td>
                  <td className="text-muted-foreground px-3 py-2">
                    {d.ruleType ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {d.gender ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {d.ageGroup ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {d.weightClass ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {d.skillLevel ?? "—"}
                  </td>
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
            <p className="font-medium">{d.sportType}</p>
            <p className="text-muted-foreground">
              {[d.gender, d.ageGroup, d.weightClass].filter(Boolean).join(" · ") ||
                "경기구분 정보"}
            </p>
            <p className="text-muted-foreground text-xs">
              룰 {d.ruleType ?? "—"} · 급수 {d.skillLevel ?? "—"}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
