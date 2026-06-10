"use client";

import { Fragment, type ReactNode } from "react";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import {
  FieldMemoForm,
  FieldStatusRowActions,
  WeighInWeightForm,
} from "@/components/domain/field-status/FieldStatusApplicationActions";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

function StatusClickWrap({
  onOpenDetail,
  children,
}: {
  onOpenDetail: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

export function OrganizerFieldStatusTable({
  rows,
  emptyMessage = "표시할 승인 신청자가 없습니다.",
  onOpenDetail,
}: {
  rows: FieldStatusRowDTO[];
  emptyMessage?: string;
  onOpenDetail: (row: FieldStatusRowDTO) => void;
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
        <table className="w-full min-w-[64rem] text-left text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="min-w-[7rem] px-3 py-2 font-medium">선수명</th>
              <th className="min-w-[8rem] px-3 py-2 font-medium">체육관</th>
              <th className="min-w-[12rem] px-3 py-2 font-medium">신청 부문</th>
              <th className="min-w-[5rem] px-3 py-2 font-medium">신청 체급</th>
              <th className="min-w-[6rem] px-3 py-2 font-medium">현장 확인</th>
              <th className="min-w-[7rem] px-3 py-2 font-medium">계체 몸무게</th>
              <th className="min-w-[6rem] px-3 py-2 font-medium">계체 결과</th>
              <th className="min-w-[7rem] px-3 py-2 font-medium">출전 확정</th>
              <th className="min-w-[10rem] px-3 py-2 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.applicationId}>
                <tr className="border-t align-top">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="font-medium underline-offset-2 hover:underline"
                      onClick={() => onOpenDetail(row)}
                    >
                      {row.fighterName}
                    </button>
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-2 text-xs">
                    {row.gymName}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-xs leading-snug">
                    <span className="line-clamp-2">{row.divisionLabel}</span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.weightClassLabel ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusClickWrap onOpenDetail={() => onOpenDetail(row)}>
                      <CheckInStatusBadge status={row.checkInStatus} />
                    </StatusClickWrap>
                  </td>
                  <td className="px-3 py-2">
                    <WeighInWeightForm row={row} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusClickWrap onOpenDetail={() => onOpenDetail(row)}>
                      <WeighInStatusBadge status={row.weighInStatus} />
                    </StatusClickWrap>
                  </td>
                  <td className="px-3 py-2">
                    <StatusClickWrap onOpenDetail={() => onOpenDetail(row)}>
                      <EligibilityBadge
                        label={row.eligibilityLabel}
                        isEligible={row.isEligibleForBracket}
                        title={row.eligibilityReason}
                      />
                    </StatusClickWrap>
                  </td>
                  <td className="px-3 py-2">
                    <FieldMemoForm row={row} />
                  </td>
                </tr>
                <tr className="border-b bg-muted/15">
                  <td colSpan={9} className="px-3 py-2">
                    <FieldStatusRowActions row={row} layout="compact" />
                  </td>
                </tr>
              </Fragment>
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
            <button
              type="button"
              className="text-left"
              onClick={() => onOpenDetail(row)}
            >
              <h3 className="font-medium">{row.fighterName}</h3>
              <p className="text-muted-foreground text-xs">{row.gymName}</p>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                {row.divisionLabel}
              </p>
            </button>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <CheckInStatusBadge status={row.checkInStatus} />
              <WeighInStatusBadge status={row.weighInStatus} />
              <EligibilityBadge
                label={row.eligibilityLabel}
                isEligible={row.isEligibleForBracket}
                title={row.eligibilityReason}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2">
              <WeighInWeightForm row={row} />
              <FieldMemoForm row={row} />
            </div>
            <div className="mt-2 border-t pt-2">
              <FieldStatusRowActions row={row} layout="compact" />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
