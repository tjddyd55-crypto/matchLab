import type { GymFieldStatusSummary } from "@/lib/ui/field-status-ui";
import { Card, CardContent } from "@/components/ui/card";
import { matchonGridGapClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="muted" className="px-4 py-3">
      <CardContent className="p-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
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
        matchonGridGapClass,
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
