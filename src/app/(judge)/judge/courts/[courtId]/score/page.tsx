import { CourtScoreJudgePanel } from "@/components/domain/judges/CourtScoreJudgePanel";
import { judgeCourtService } from "@/lib/services/judge-court.service";

export const dynamic = "force-dynamic";

export default async function CourtScoreJudgePage({
  params,
}: {
  params: Promise<{ courtId: string }>;
}) {
  const { courtId } = await params;
  const match = await judgeCourtService.getScoringContext(courtId);
  return <CourtScoreJudgePanel match={match} />;
}
