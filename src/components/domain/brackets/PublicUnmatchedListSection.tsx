import type { PublicUnmatchedCandidateDTO } from "@/lib/dto/public";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PublicUnmatchedListSection({
  candidates,
}: {
  candidates: PublicUnmatchedCandidateDTO[];
}) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <Card variant="muted" className="py-4">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">추가 매칭 대기 명단</CardTitle>
          <CardDescription>
            자동 대진 생성 후 아직 상대가 배정되지 않은 신청자입니다.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 border-b text-xs font-medium uppercase">
            <tr>
              <th className="px-4 py-3">번호</th>
              <th className="px-4 py-3">성별</th>
              <th className="px-4 py-3">연령부</th>
              <th className="px-4 py-3">전적</th>
              <th className="px-4 py-3">체급</th>
              <th className="px-4 py-3">경기구분</th>
              <th className="px-4 py-3">선수명</th>
              <th className="px-4 py-3">체육관</th>
              <th className="px-4 py-3">사유</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={`${c.order}-${c.fighterName}`} className="border-b last:border-0">
                <td className="px-4 py-3">{c.order}</td>
                <td className="px-4 py-3">{c.gender ?? "—"}</td>
                <td className="px-4 py-3">{c.ageGroup ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{c.recordSummary}</td>
                <td className="px-4 py-3">{c.weightClass ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{c.divisionLabel}</td>
                <td className="px-4 py-3 font-medium">{c.fighterName}</td>
                <td className="px-4 py-3">{c.gymName}</td>
                <td className="px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
                  {c.reasonLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 md:hidden">
        {candidates.map((c) => (
          <Card key={`${c.order}-${c.fighterName}-m`}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground text-xs">#{c.order}</span>
                <span className="text-xs text-amber-800 dark:text-amber-200">
                  {c.reasonLabel}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold">{c.fighterName}</p>
              <p className="text-muted-foreground text-sm">{c.gymName}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">경기구분</dt>
                  <dd>{c.divisionLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">체급</dt>
                  <dd>{c.weightClass ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">연령부</dt>
                  <dd>{c.ageGroup ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">전적</dt>
                  <dd>{c.recordSummary}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
