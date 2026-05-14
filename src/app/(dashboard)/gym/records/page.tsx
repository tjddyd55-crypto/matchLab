import { requireActor } from "@/lib/auth/actor";
import { resultService } from "@/lib/services/result.service";

export const dynamic = "force-dynamic";

export default async function GymRecordsPage() {
  const actor = await requireActor();

  if (actor.role !== "gym" || !actor.gymId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-heading text-2xl font-semibold">체육관 전적</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          체육관(관장) 계정에서 현재 소속 선수들의 공식 전적을 모아볼 수 있습니다.
        </p>
      </div>
    );
  }

  const { summaries, rows } = await resultService.listGymFighterRecords(actor);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold">체육관 전적 요약</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          현재 소속 선수 기준입니다. 과거 소속 시점 통계는 후속 확장 TODO.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => (
          <div
            key={s.fighterId}
            className="ring-foreground/10 rounded-xl border bg-card p-4 text-sm shadow-sm"
          >
            <div className="font-semibold">{s.name}</div>
            <div className="text-muted-foreground text-xs">{s.fighterCode}</div>
            <div className="text-muted-foreground mt-2 text-xs">
              캐시 전적 {s.recordWin}승 {s.recordLoss}패 {s.recordDraw}무
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold">경기별 기록</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            소속 선수의 공식 MatchResult가 아직 없습니다.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">선수</th>
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
  );
}
