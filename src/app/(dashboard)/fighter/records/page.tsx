import { FighterDashboardEmptyState } from "@/components/domain/fighter-dashboard/FighterDashboardEmptyState";
import { FighterCareerRecordsOverview } from "@/components/domain/fighters/career/FighterCareerRecordsOverview";
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
import {
  matchonCompactTableWrapClass,
  matchonMobileCardListClass,
  matchonPageHeaderStackClass,
} from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { resultService } from "@/lib/services/result.service";
import { fighterUnifiedProfileService } from "@/lib/services/fighter-unified-profile.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FighterRecordsPage() {
  const actor = await requireActor();
  await requireFighterDashboardReady(actor);

  if (actor.role !== "fighter" || !actor.fighterId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={cn(matchonPageStackClass, "max-w-3xl")}>
          <FighterDashboardEmptyState
            title="전적을 확인할 수 없습니다"
            description="선수 계정으로 로그인하면 본인 공식 전적(MatchResult 확정·정정)을 확인할 수 있습니다."
            tone="warning"
          />
        </div>
      </div>
    );
  }

  const [rows, careerProfile] = await Promise.all([
    resultService.listFighterRecords(actor, actor.fighterId),
    fighterUnifiedProfileService.loadForFighter(actor),
  ]);

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-5xl")}>
        <header className={matchonPageHeaderStackClass}>
          <h1 className={matchonPageTitleClass}>내 전적</h1>
          <p className={matchonPageDescClass}>
            전체 전적은 MATCHON 공식 + 기존/외부 합산입니다. 아래 목록은 공식
            MatchResult 원천입니다.
          </p>
        </header>

        <FighterCareerRecordsOverview
          combinedRecord={careerProfile.combinedRecord}
          officialRecord={careerProfile.officialRecord}
          externalRecord={careerProfile.externalRecord}
        />

        {rows.length === 0 ? (
          <FighterDashboardEmptyState
            title="아직 등록된 공식 경기 기록이 없습니다"
            description="경기 결과가 확정되면 여기에 표시됩니다."
          />
        ) : (
          <>
            <div className={matchonMobileCardListClass}>
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

            <div className={matchonCompactTableWrapClass}>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-matchon-border bg-matchon-surface/50 text-xs font-medium uppercase text-matchon-text-secondary">
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
                    <tr
                      key={r.id}
                      className="border-b border-matchon-border last:border-0"
                    >
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
          </>
        )}
      </div>
    </div>
  );
}
