import type { CourtJudgeMatchVM } from "@/lib/services/judge-court.service";
import type { CourtJudgeScene } from "@/lib/court-judge-page-state";
import { CourtJudgeMatchList } from "@/components/domain/judges/CourtJudgeMatchList";
import { CourtJudgeSceneBanner } from "@/components/domain/judges/CourtJudgeSceneBanner";

type Props = {
  scene: CourtJudgeScene;
  matches: CourtJudgeMatchVM[];
  role: "score" | "head";
};

/** 경기장 심판 화면 — 배정·대기·종료 등 비활성 채점/판정 상태 안내 */
export function CourtJudgeEmptyState({
  scene,
  matches,
  role,
}: Props) {
  if (scene === "active") {
    return null;
  }

  return (
    <div className="space-y-4">
      <CourtJudgeSceneBanner scene={scene} role={role} />
      {matches.length > 0 ? (
        <CourtJudgeMatchList matches={matches} ongoingMatchId={null} selectable={false} />
      ) : null}
    </div>
  );
}
