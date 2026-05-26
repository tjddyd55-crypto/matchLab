import type { FieldStatusSummaryDTO } from "@/lib/services/field-status.service";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="ring-foreground/10 rounded-lg border bg-card px-4 py-3 shadow-sm">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function FieldStatusSummaryCards({
  summary,
}: {
  summary: FieldStatusSummaryDTO;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <StatCard label="전체 승인 신청자" value={summary.totalApproved} />
      <StatCard label="현장 확인" value={summary.checkedIn} />
      <StatCard label="미확인" value={summary.pendingCheckIn} />
      <StatCard label="미출석·철회·실격" value={summary.noShow} />
      <StatCard label="계체 통과" value={summary.weighInPass} />
      <StatCard label="계체 실패" value={summary.weighInFail} />
      <StatCard label="수동 승인" value={summary.manualPass} />
      <StatCard label="출전 확정" value={summary.eligibleCount} />
    </div>
  );
}
