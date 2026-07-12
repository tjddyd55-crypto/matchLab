import { FighterDashboardEmptyState } from "@/components/domain/fighter-dashboard/FighterDashboardEmptyState";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { requireFighterDashboardReady } from "@/lib/auth/fighter-dashboard-gate";
import {
  getFighterRecordOutcomeLabel,
  resolveFighterRecordOutcomeMatchonStatus,
} from "@/lib/ui/fighter-dashboard-ui";
import { resultService } from "@/lib/services/result.service";

export const dynamic = "force-dynamic";

export default async function FighterRecordsPage() {
  const actor = await requireActor();
  await requireFighterDashboardReady(actor);

  if (actor.role !== "fighter" || !actor.fighterId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <FighterDashboardEmptyState
          title="전적을 확인할 수 없습니다"
          description="선수 계정으로 로그인하면 본인 공식 전적(MatchResult 확정·정정)을 확인할 수 있습니다."
          tone="warning"
        />
      </div>
    );
  }

  const rows = await resultService.listFighterRecords(actor, actor.fighterId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          내 전적
        </h1>
        <p className="text-muted-foreground text-sm">
          숫자 요약은 Fighter 캐시이며, 아래 목록은 공식 MatchResult 원천입니다.
        </p>
      </header>

      {rows.length === 0 ? (
        <FighterDashboardEmptyState
          title="아직 등록된 공식 경기 기록이 없습니다"
          description="경기 결과가 확정되면 여기에 표시됩니다."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{r.eventTitle}</CardTitle>
                    <CardDescription>{r.bracketTitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="text-muted-foreground text-xs">
                      {r.matchDate.toLocaleString("ko-KR")}
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">상대</span>
                      <span>{r.opponentName ?? "—"}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-muted-foreground">결과</span>
                      <MatchonStatusBadge
                        status={resolveFighterRecordOutcomeMatchonStatus(r.result)}
                        label={getFighterRecordOutcomeLabel(r.result)}
                        size="sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted/50 border-b text-xs font-medium uppercase">
                    <tr>
                      <th className="px-3 py-2">일시</th>
                      <th className="px-3 py-2">대회</th>
                      <th className="px-3 py-2">대진표 그룹</th>
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
                          <td className="px-3 py-3">
                            <MatchonStatusBadge
                              status={resolveFighterRecordOutcomeMatchonStatus(
                                r.result,
                              )}
                              label={getFighterRecordOutcomeLabel(r.result)}
                              size="sm"
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
