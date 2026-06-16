import { CourtHeadJudgePanel } from "@/components/domain/judges/CourtHeadJudgePanel";
import { judgeCourtService } from "@/lib/services/judge-court.service";

export const dynamic = "force-dynamic";

export default async function CourtHeadJudgePage({
  params,
}: {
  params: Promise<{ courtId: string }>;
}) {
  const { courtId } = await params;
  const ctx = await judgeCourtService.getHeadContext(courtId);
  return <CourtHeadJudgePanel match={ctx.match} scorecards={ctx.scorecards} />;
}
