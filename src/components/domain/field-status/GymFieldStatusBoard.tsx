"use client";

import { GymFieldStatusCards } from "@/components/domain/field-status/GymFieldStatusCards";
import { GymFieldStatusSummaryCards } from "@/components/domain/field-status/GymFieldStatusSummaryCards";
import { GymFieldStatusTable } from "@/components/domain/field-status/GymFieldStatusTable";
import { FieldStatusEmptyState } from "@/components/domain/field-status/FieldStatusEmptyState";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { buildGymFieldStatusSummaryFromRows } from "@/lib/ui/field-status-ui";
import {
  matchonSectionStackClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export function GymFieldStatusBoard({ rows }: { rows: FieldStatusRowDTO[] }) {
  const summary = buildGymFieldStatusSummaryFromRows(rows);

  if (rows.length === 0) {
    return (
      <FieldStatusEmptyState message="승인된 신청 선수가 없습니다. 신청·승인 후 이 화면에서 현장 상태를 확인할 수 있습니다." />
    );
  }

  return (
    <div className={cn("flex flex-col", matchonSectionStackClass)}>
      <GymFieldStatusSummaryCards summary={summary} />

      <section className="flex flex-col gap-4">
        <h2 className={matchonSectionTitleClass}>현장·계체 상태</h2>
        <GymFieldStatusTable rows={rows} />
        <GymFieldStatusCards rows={rows} />
      </section>
    </div>
  );
}
