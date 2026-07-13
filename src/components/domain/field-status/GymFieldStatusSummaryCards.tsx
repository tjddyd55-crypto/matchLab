import type { GymFieldStatusSummary } from "@/lib/ui/field-status-ui";
import {
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
  matchonStatsGridClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={matchonStatCardClass}>
      <p className={matchonStatLabelClass}>{label}</p>
      <p className={cn(matchonStatValueClass, "mt-1 tabular-nums")}>{value}</p>
    </div>
  );
}

export function GymFieldStatusSummaryCards({
  summary,
}: {
  summary: GymFieldStatusSummary;
}) {
  return (
    <div
      className={cn(
        "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        matchonStatsGridClass,
      )}
    >
      <StatCard label="전체 선수" value={summary.total} />
      <StatCard label="현장 확인" value={summary.checkedIn} />
      <StatCard label="미확인" value={summary.pendingCheckIn} />
      <StatCard label="계체 통과" value={summary.weighInPass} />
      <StatCard label="계체 실패" value={summary.weighInFail} />
      <StatCard label="출전 확정" value={summary.eligible} />
    </div>
  );
}
