"use client";

import { WeighInWeightInput } from "@/components/domain/field-status/FieldStatusApplicationActions";
import {
  DisqualificationReasonForm,
  WeighInFailureResolutionForm,
} from "@/components/domain/field-status/WeighInFailureResolutionForm";
import { FieldFinalResultCell } from "@/components/domain/field-status/FieldFinalResultCell";
import { FieldStatusResetButton } from "@/components/domain/field-status/FieldStatusResetButton";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
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
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="px-2 py-2 font-medium">체육관</th>
              <th className="px-2 py-2 font-medium">선수명</th>
              <th className="px-2 py-2 font-medium">
                {APPLIED_MATCH_CATEGORY_LABEL}
              </th>
              <th className="px-2 py-2 font-medium">계체 몸무게</th>
              <th className="px-2 py-2 font-medium">진행여부</th>
              <th className="px-2 py-2 font-medium">실격 사유</th>
              <th className="px-2 py-2 font-medium">최종결과</th>
              <th className="px-2 py-2 font-medium">초기화</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId} className="border-t align-top">
                <td className="min-w-0 px-2 py-2 text-xs font-medium">
                  <span
                    className="line-clamp-2 break-words whitespace-normal leading-snug"
                    title={row.gymName}
                  >
                    {row.gymName}
                  </span>
                </td>
                <td className="min-w-0 px-2 py-2">
                  <p className="break-words font-medium leading-snug">
                    {row.fighterName}
                  </p>
                  <div className="mt-1">
                    <WeighInStatusBadge status={row.weighInStatus} />
                  </div>
                </td>
                <td className="min-w-0 px-2 py-2 text-xs leading-snug">
                  <span
                    className="line-clamp-2 break-words whitespace-normal"
                    title={row.divisionLabel}
                  >
                    {row.divisionLabel}
                  </span>
                </td>
                <td className="min-w-0 px-2 py-2">
                  <WeighInWeightInput
                    key={`${row.applicationId}-${row.weighInWeightKg}`}
                    row={row}
                  />
                </td>
                <td className="min-w-0 px-2 py-2">
                  <WeighInFailureResolutionForm row={row} compact />
                </td>
                <td className="min-w-0 px-2 py-2">
                  <DisqualificationReasonForm row={row} compact />
                </td>
                <td className="min-w-0 px-2 py-2">
                  <FieldFinalResultCell row={row} />
                </td>
                <td className="min-w-0 px-2 py-2">
                  <FieldStatusResetButton row={row} />
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
            <p className="text-muted-foreground break-words text-xs font-medium">
              {row.gymName}
            </p>
            <h3 className="break-words font-medium">{row.fighterName}</h3>
            <div className="mt-1">
              <WeighInStatusBadge status={row.weighInStatus} />
            </div>
            <p
              className="text-muted-foreground mt-2 line-clamp-2 break-words text-xs"
              title={row.divisionLabel}
            >
              {row.divisionLabel}
            </p>
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
                  최종결과
                </p>
                <FieldFinalResultCell row={row} />
              </div>
              <FieldStatusResetButton row={row} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
