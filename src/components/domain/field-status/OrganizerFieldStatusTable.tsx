"use client";

import { WeighInWeightInput } from "@/components/domain/field-status/FieldStatusApplicationActions";
import {
  DisqualificationReasonForm,
  WeighInFailureResolutionForm,
} from "@/components/domain/field-status/WeighInFailureResolutionForm";
import { FieldFinalResultCell } from "@/components/domain/field-status/FieldFinalResultCell";
import { FieldStatusResetButton } from "@/components/domain/field-status/FieldStatusResetButton";
import { FieldStatusEmptyState } from "@/components/domain/field-status/FieldStatusEmptyState";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fieldStatusCenterCellClass,
  fieldStatusTextCellClass,
  nowrapTruncateClass,
} from "@/lib/ui/match-grid-layout";
import {
  listTableHeaderCellCenterClass,
  listTableHeaderCellStartClass,
  listTableHeaderRowClass,
} from "@/lib/ui/list-table-styles";
import { matchonCompactTableWrapClass } from "@/lib/ui/matchon-shell-ui";
import { APPLIED_MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";
import { cn } from "@/lib/utils";

export function OrganizerFieldStatusTable({
  rows,
  emptyMessage = "표시할 승인 신청자가 없습니다.",
}: {
  rows: FieldStatusRowDTO[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <FieldStatusEmptyState message={emptyMessage} />;
  }

  return (
    <>
      <div className={cn(matchonCompactTableWrapClass, "hidden w-full min-w-0 md:block")}>
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[11%]" />
            <col className="w-[18%]" />
            <col className="w-[11%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[17%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className={listTableHeaderRowClass}>
            <tr>
              <th className={listTableHeaderCellStartClass}>체육관</th>
              <th className={listTableHeaderCellStartClass}>선수명</th>
              <th className={listTableHeaderCellStartClass}>
                {APPLIED_MATCH_CATEGORY_LABEL}
              </th>
              <th className={listTableHeaderCellCenterClass}>계체 몸무게</th>
              <th className={listTableHeaderCellCenterClass}>진행여부</th>
              <th className={listTableHeaderCellCenterClass}>실격 사유</th>
              <th className={listTableHeaderCellCenterClass}>경기결과</th>
              <th className={listTableHeaderCellCenterClass}>초기화</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId} className="border-t align-middle">
                <td className="min-w-0 px-2 py-2 align-middle text-xs font-medium">
                  <div className={fieldStatusTextCellClass}>
                    <span
                      className={nowrapTruncateClass}
                      title={row.gymName}
                    >
                      {row.gymName}
                    </span>
                  </div>
                </td>
                <td className="min-w-0 px-2 py-2 align-middle">
                  <div className={fieldStatusTextCellClass}>
                    <p
                      className={`font-medium leading-snug ${nowrapTruncateClass}`}
                      title={row.fighterName}
                    >
                      {row.fighterName}
                    </p>
                  </div>
                </td>
                <td className="min-w-0 px-2 py-2 align-middle text-xs leading-snug">
                  <div className={fieldStatusTextCellClass} title={row.divisionLabel}>
                    <DivisionCompactDisplay
                      division={row.division}
                      mainClassName={`text-xs ${nowrapTruncateClass}`}
                      secondaryClassName="text-[11px]"
                    />
                  </div>
                </td>
                <td className="min-w-0 px-2 py-2 align-middle">
                  <div className={fieldStatusCenterCellClass}>
                    <WeighInWeightInput
                      key={`${row.applicationId}-${row.weighInWeightKg}`}
                      row={row}
                    />
                  </div>
                </td>
                <td className="min-w-0 px-2 py-2 align-middle">
                  <div className={fieldStatusCenterCellClass}>
                    <WeighInFailureResolutionForm row={row} compact />
                  </div>
                </td>
                <td className="min-w-0 px-2 py-2 align-middle">
                  <div className={fieldStatusCenterCellClass}>
                    <DisqualificationReasonForm row={row} compact />
                  </div>
                </td>
                <td className="min-w-0 px-2 py-2 align-middle">
                  <div className={fieldStatusCenterCellClass}>
                    <FieldFinalResultCell row={row} />
                  </div>
                </td>
                <td className="min-w-0 px-2 py-2 align-middle">
                  <div className={fieldStatusCenterCellClass}>
                    <FieldStatusResetButton row={row} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex min-w-0 flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.applicationId} className="rounded-xl border-matchon-border bg-white py-4 shadow-sm">
            <CardHeader className="space-y-2 px-4 py-0">
              <p className="text-muted-foreground truncate text-xs font-medium">
                {row.gymName}
              </p>
              <CardTitle className="truncate text-base leading-snug">
                {row.fighterName}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5">
                <CheckInStatusBadge status={row.checkInStatus} />
                <WeighInStatusBadge status={row.weighInStatus} />
                <EligibilityBadge
                  label={row.eligibilityLabel}
                  isEligible={row.isEligibleForBracket}
                  title={row.eligibilityReason}
                />
              </div>
              <div title={row.divisionLabel}>
                <DivisionCompactDisplay
                  division={row.division}
                  mainClassName="text-xs"
                  secondaryClassName="text-[11px]"
                />
              </div>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-3 px-4 pt-2">
              <div className="min-w-0 border-t pt-3">
                <p className="text-muted-foreground mb-2 text-[11px] font-medium">
                  계체 몸무게
                </p>
                <WeighInWeightInput
                  key={`${row.applicationId}-${row.weighInWeightKg}-m`}
                  row={row}
                  touchFriendly
                />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground mb-2 text-[11px] font-medium">
                  진행여부
                </p>
                <WeighInFailureResolutionForm row={row} compact touchFriendly />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground mb-2 text-[11px] font-medium">
                  실격 사유
                </p>
                <DisqualificationReasonForm row={row} compact touchFriendly />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground mb-2 text-[11px] font-medium">
                  경기결과
                </p>
                <FieldFinalResultCell row={row} />
              </div>
              <div className="flex justify-start border-t pt-2">
                <FieldStatusResetButton row={row} touchFriendly />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
