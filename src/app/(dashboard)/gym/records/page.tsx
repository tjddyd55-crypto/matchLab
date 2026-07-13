import { requireActor } from "@/lib/auth/actor";
import { resultService } from "@/lib/services/result.service";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import {
  matchonCompactTableWrapClass,
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatsGridClass,
} from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymRecordsPage() {
  const actor = await requireActor();

  if (actor.role !== "gym" || !actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <div className="min-w-0 space-y-1">
            <h1 className={matchonPageTitleClass}>체육관 전적</h1>
            <p className={matchonPageDescClass}>
              체육관(관장) 계정에서 현재 소속 선수들의 공식 전적을 모아볼 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { summaries, rows } = await resultService.listGymFighterRecords(actor);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>체육관 전적 요약</h1>
          <p className={matchonPageDescClass}>
            현재 소속 선수 기준입니다. 과거 소속 시점 통계는 후속 확장 TODO.
          </p>
        </div>

        {summaries.length > 0 ? (
          <section className={matchonStatsGridClass}>
            {summaries.map((s) => (
              <div key={s.fighterId} className={matchonStatCardClass}>
                <p className="font-semibold text-matchon-text-primary">{s.name}</p>
                <p className={matchonStatLabelClass}>{s.fighterCode}</p>
                <p className={cn(matchonStatLabelClass, "mt-2")}>
                  캐시 전적 {s.recordWin}승 {s.recordLoss}패 {s.recordDraw}무
                </p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className={matchonSectionTitleClass}>경기별 기록</h2>
          {rows.length === 0 ? (
            <MatchonEmptyState
              title="공식 전적이 없습니다"
              description="소속 선수의 공식 MatchResult가 아직 없습니다."
            />
          ) : (
            <div className={matchonCompactTableWrapClass}>
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-matchon-border bg-matchon-primary-light/25 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2">선수</th>
                    <th className="px-3 py-2">일시</th>
                    <th className="px-3 py-2">대회</th>
                    <th className="px-3 py-2">대진표 그룹</th>
                    <th className="px-3 py-2">상대</th>
                    <th className="px-3 py-2">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-matchon-border last:border-0"
                    >
                      <td className="px-3 py-3 text-xs">
                        {r.fighterRecordOwnerLabel ?? "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.matchDate.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-3">{r.eventTitle}</td>
                      <td className="px-3 py-3">{r.bracketTitle}</td>
                      <td className="px-3 py-3">{r.opponentName ?? "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs">{r.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
