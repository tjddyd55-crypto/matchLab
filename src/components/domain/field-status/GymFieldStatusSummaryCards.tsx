import type { GymFieldStatusSummary } from "@/lib/ui/field-status-ui";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { eventManagementStatGrid6Class } from "@/lib/ui/event-management-ui";

export function GymFieldStatusSummaryCards({
  summary,
}: {
  summary: GymFieldStatusSummary;
}) {
  return (
    <div className={eventManagementStatGrid6Class}>
      <MatchonStatCardButton label="전체 선수" value={summary.total} />
      <MatchonStatCardButton label="현장 확인" value={summary.checkedIn} />
      <MatchonStatCardButton label="미확인" value={summary.pendingCheckIn} />
      <MatchonStatCardButton label="계체 통과" value={summary.weighInPass} />
      <MatchonStatCardButton label="계체 실패" value={summary.weighInFail} />
      <MatchonStatCardButton label="출전 확정" value={summary.eligible} />
    </div>
  );
}
