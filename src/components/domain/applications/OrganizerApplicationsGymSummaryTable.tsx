"use client";

import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  isPaidForOrganizerDisplay,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import { OrganizerApplicationsEmptyState } from "@/components/domain/applications/OrganizerApplicationsEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type GymApplicationSummary = {
  gymId: string;
  gymName: string;
  fighterCount: number;
  paidCount: number;
  unpaidCount: number;
  approvedCount: number;
  pendingCount: number;
  gymCancelledCount: number;
  organizerCancelledCount: number;
};

function buildGymSummaries(rows: OrganizerApplicationRowVM[]): GymApplicationSummary[] {
  const map = new Map<string, GymApplicationSummary>();

  for (const row of rows) {
    const gymId = row.gymId || "_unknown";
    const entry =
      map.get(gymId) ??
      ({
        gymId,
        gymName: row.gymName,
        fighterCount: 0,
        paidCount: 0,
        unpaidCount: 0,
        approvedCount: 0,
        pendingCount: 0,
        gymCancelledCount: 0,
        organizerCancelledCount: 0,
      } satisfies GymApplicationSummary);

    entry.fighterCount += 1;
    if (isPaidForOrganizerDisplay(row.paymentStatus)) entry.paidCount += 1;
    else entry.unpaidCount += 1;

    const display = resolveOrganizerApplicationDisplayStatus({
      status: row.applicationStatus,
      cancellationSource: row.cancellationSource,
    });
    if (display === "approved") entry.approvedCount += 1;
    if (display === "pending") entry.pendingCount += 1;
    if (display === "gym_cancelled") entry.gymCancelledCount += 1;
    if (display === "organizer_cancelled") entry.organizerCancelledCount += 1;

    map.set(gymId, entry);
  }

  return [...map.values()].sort((a, b) => a.gymName.localeCompare(b.gymName, "ko"));
}

export function OrganizerApplicationsGymSummaryTable({
  rows,
  selectedGymId,
  onSelectGym,
}: {
  rows: OrganizerApplicationRowVM[];
  selectedGymId?: string | null;
  onSelectGym?: (gymId: string | null) => void;
}) {
  const summaries = buildGymSummaries(rows);

  if (summaries.length === 0) {
    return (
      <OrganizerApplicationsEmptyState message="신청 데이터가 없습니다." />
    );
  }

  return (
    <Card variant="default" className="overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm font-semibold">체육관별 현황</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs font-normal">
          체육관을 클릭하면 해당 체육관 선수만 필터됩니다.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead className="bg-muted/40 text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">체육관</th>
            <th className="px-3 py-2 font-medium text-center">참가선수</th>
            <th className="px-3 py-2 font-medium text-center">입금완료</th>
            <th className="px-3 py-2 font-medium text-center">미입금</th>
            <th className="px-3 py-2 font-medium text-center">승인</th>
            <th className="px-3 py-2 font-medium text-center">미승인</th>
            <th className="px-3 py-2 font-medium text-center">체육관취소</th>
            <th className="px-3 py-2 font-medium text-center">주최측취소</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((gym) => {
            const isSelected = selectedGymId === gym.gymId;
            return (
              <tr
                key={gym.gymId}
                className={cn(
                  "border-t",
                  onSelectGym && "cursor-pointer hover:bg-muted/30",
                  isSelected && "bg-primary/5",
                )}
                onClick={() => onSelectGym?.(isSelected ? null : gym.gymId)}
              >
                <td className="px-3 py-2.5 font-medium">{gym.gymName}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{gym.fighterCount}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-emerald-700">
                  {gym.paidCount}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">{gym.unpaidCount}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{gym.approvedCount}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{gym.pendingCount}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{gym.gymCancelledCount}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{gym.organizerCancelledCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </CardContent>
    </Card>
  );
}

export { buildGymSummaries };
