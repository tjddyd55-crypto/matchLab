import type { CourtJudgeMatchVM } from "@/lib/services/judge-court.service";
import type { CourtJudgeScene } from "@/lib/court-judge-page-state";
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

  if (matches.length === 0 && scene === "no_matches") {
    return <CourtJudgeSceneBanner scene={scene} role={role} />;
  }

  return <CourtJudgeSceneBanner scene={scene} role={role} />;
}
