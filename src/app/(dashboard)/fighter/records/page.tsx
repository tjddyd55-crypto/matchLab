import { requireActor } from "@/lib/auth/actor";
import { requireFighterDashboardReady } from "@/lib/auth/fighter-dashboard-gate";
import { resultService } from "@/lib/services/result.service";

export const dynamic = "force-dynamic";

export default async function FighterRecordsPage() {
  const actor = await requireActor();
  await requireFighterDashboardReady(actor);

  if (actor.role !== "fighter" || !actor.fighterId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-heading text-2xl font-semibold">전적</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          선수 계정으로 로그인하면 본인 공식 전적(MatchResult 확정·정정)을 확인할 수
          있습니다.
        </p>
      </div>
    );
  }

  const rows = await resultService.listFighterRecords(actor, actor.fighterId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl font-semibold">내 전적</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        숫자 요약은 Fighter 캐시이며, 아래 목록은 공식 MatchResult 원천입니다.
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          아직 등록된 공식 경기 기록이 없습니다.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase">
              <tr>
                <th className="px-3 py-2">일시</th>
                <th className="px-3 py-2">대회</th>
                <th className="px-3 py-2">브래킷</th>
                <th className="px-3 py-2">상대</th>
                <th className="px-3 py-2">결과</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
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
    </div>
  );
}
