"use client";

import {
  WeighInWeightInput,
} from "@/components/domain/field-status/FieldStatusApplicationActions";
import {
  DisqualificationReasonForm,
  WeighInFailureResolutionForm,
} from "@/components/domain/field-status/WeighInFailureResolutionForm";
import { FieldFinalResultCell } from "@/components/domain/field-status/FieldFinalResultCell";
import { FieldStatusPrimaryActions } from "@/components/domain/field-status/FieldStatusPrimaryActions";
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
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[72rem] text-left text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="min-w-[7rem] px-3 py-2 font-medium">선수명</th>
              <th className="min-w-[8rem] px-3 py-2 font-medium">체육관</th>
              <th className="min-w-[12rem] px-3 py-2 font-medium">
                {APPLIED_MATCH_CATEGORY_LABEL}
              </th>
              <th className="min-w-[8rem] px-3 py-2 font-medium">계체 몸무게</th>
              <th className="min-w-[7rem] px-3 py-2 font-medium">계체 결과</th>
              <th className="min-w-[9rem] px-3 py-2 font-medium">실격 처리</th>
              <th className="min-w-[10rem] px-3 py-2 font-medium">결과입력</th>
              <th className="min-w-[10rem] px-3 py-2 font-medium">실격 사유</th>
              <th className="min-w-[10rem] px-3 py-2 font-medium">최종결과</th>
              <th className="min-w-[5rem] px-3 py-2 font-medium">초기화</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{row.fighterName}</td>
                <td className="max-w-[10rem] truncate px-3 py-2 text-xs">
                  {row.gymName}
                </td>
                <td className="max-w-[14rem] px-3 py-2 text-xs leading-snug">
                  <span className="line-clamp-2">{row.divisionLabel}</span>
                </td>
                <td className="px-3 py-2">
                  <WeighInWeightInput
                    key={`${row.applicationId}-${row.weighInWeightKg}`}
                    row={row}
                  />
                </td>
                <td className="px-3 py-2">
                  <WeighInStatusBadge status={row.weighInStatus} />
                </td>
                <td className="px-3 py-2">
                  <FieldStatusPrimaryActions row={row} />
                </td>
                <td className="px-3 py-2">
                  <WeighInFailureResolutionForm row={row} />
                </td>
                <td className="px-3 py-2">
                  <DisqualificationReasonForm row={row} />
                </td>
                <td className="px-3 py-2">
                  <FieldFinalResultCell row={row} />
                </td>
                <td className="px-3 py-2">
                  <FieldStatusResetButton row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.applicationId}
            className="ring-foreground/10 rounded-xl border bg-card p-3 shadow-sm"
          >
            <h3 className="font-medium">{row.fighterName}</h3>
            <p className="text-muted-foreground text-xs">{row.gymName}</p>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
              {row.divisionLabel}
            </p>
            <div className="mt-2 grid gap-2 border-t pt-2">
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  계체 몸무게
                </p>
                <WeighInWeightInput
                  key={`${row.applicationId}-${row.weighInWeightKg}-m`}
                  row={row}
                />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  계체 결과
                </p>
                <WeighInStatusBadge status={row.weighInStatus} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  실격 처리
                </p>
                <FieldStatusPrimaryActions row={row} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  결과입력
                </p>
                <WeighInFailureResolutionForm row={row} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                  실격 사유
                </p>
                <DisqualificationReasonForm row={row} />
              </div>
              <div>
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
