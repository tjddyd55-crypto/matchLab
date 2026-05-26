import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export function GymFieldStatusTable({ rows }: { rows: FieldStatusRowDTO[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        승인된 신청 선수가 없습니다. 신청·승인 후 이 화면에서 현장 상태를 확인할
        수 있습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <thead className="bg-muted/40 text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">선수명</th>
            <th className="px-3 py-2 font-medium">신청 부문</th>
            <th className="px-3 py-2 font-medium">현장 확인</th>
            <th className="px-3 py-2 font-medium">계체 결과</th>
            <th className="px-3 py-2 font-medium">출전 확정</th>
            <th className="px-3 py-2 font-medium">메모</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.applicationId}>
              <td className="px-3 py-3 font-medium">{row.fighterName}</td>
              <td className="px-3 py-3 text-xs">{row.divisionLabel}</td>
              <td className="px-3 py-3">
                <CheckInStatusBadge status={row.checkInStatus} />
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-col gap-1">
                  <WeighInStatusBadge status={row.weighInStatus} />
                  {row.weighInWeightKg != null ? (
                    <span className="text-muted-foreground text-xs">
                      {row.weighInWeightKg}kg
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-3">
                <EligibilityBadge
                  label={row.eligibilityLabel}
                  isEligible={row.isEligibleForBracket}
                  title={row.eligibilityReason}
                />
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {row.fieldMemo ? row.fieldMemo : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
