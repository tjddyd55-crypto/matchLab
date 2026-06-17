"use client";

import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  resolveOrganizerApplicationDisplayStatus,
  isPaidForOrganizerDisplay,
} from "@/lib/application-display-status";
import { cn } from "@/lib/utils";

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-card px-4 py-3 shadow-sm">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-[11px]">{hint}</p> : null}
    </div>
  );
}

export function OrganizerApplicationsSummaryCards({
  rows,
}: {
  rows: OrganizerApplicationRowVM[];
}) {
  const gymCount = new Set(rows.map((r) => r.gymId).filter(Boolean)).size;
  const fighterCount = rows.length;
  const paidCount = rows.filter((r) => isPaidForOrganizerDisplay(r.paymentStatus)).length;
  const pendingCount = rows.filter(
    (r) =>
      resolveOrganizerApplicationDisplayStatus({
        status: r.applicationStatus,
        cancellationSource: r.cancellationSource,
      }) === "pending",
  ).length;

  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4")}>
      <SummaryCard label="체육관" value={gymCount} hint="신청이 있는 체육관 수" />
      <SummaryCard label="참가선수" value={fighterCount} hint="전체 신청 건수" />
      <SummaryCard label="입금내역" value={`${paidCount}/${fighterCount}`} hint="입금완료 / 전체" />
      <SummaryCard label="상태입력/처리" value={pendingCount} hint="미승인 대기" />
    </section>
  );
}
