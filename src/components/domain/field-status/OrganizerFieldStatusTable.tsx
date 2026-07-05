"use client";

import { WeighInWeightInput } from "@/components/domain/field-status/FieldStatusApplicationActions";
import {
  DisqualificationReasonForm,
  WeighInFailureResolutionForm,
} from "@/components/domain/field-status/WeighInFailureResolutionForm";
import { FieldFinalResultCell } from "@/components/domain/field-status/FieldFinalResultCell";
import { FieldStatusResetButton } from "@/components/domain/field-status/FieldStatusResetButton";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
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
import { APPLIED_MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";

export function OrganizerFieldStatusTable({
  rows,
  emptyMessage = "표시할 승인 신청자가 없습니다.",
}: {
  rows: FieldStatusRowDTO[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="hidden w-full min-w-0 rounded-xl border md:block">
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
          <article
            key={row.applicationId}
            className="min-w-0 rounded-xl border bg-card p-3 shadow-sm"
          >
            <p className="text-muted-foreground truncate text-xs font-medium">
              {row.gymName}
            </p>
            <h3 className="truncate font-medium">{row.fighterName}</h3>
            <div className="mt-2" title={row.divisionLabel}>
              <DivisionCompactDisplay
                division={row.division}
                mainClassName="text-xs"
                secondaryClassName="text-[11px]"
              />
            </div>
            <div className="mt-2 grid min-w-0 gap-2 border-t pt-2">
              <div className="min-w-0">
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  계체 몸무게
                </p>
                <WeighInWeightInput
                  key={`${row.applicationId}-${row.weighInWeightKg}-m`}
                  row={row}
                />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  진행여부
                </p>
                <WeighInFailureResolutionForm row={row} compact />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  실격 사유
                </p>
                <DisqualificationReasonForm row={row} compact />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  경기결과
                </p>
                <FieldFinalResultCell row={row} />
              </div>
              <div className="flex justify-start">
                <FieldStatusResetButton row={row} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
