"use client";

import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GymEventApplicationStatusRowDTO } from "@/lib/services/gym-event-status.service";

export function GymEventStatusCards({
  rows,
  onOpenDetail,
}: {
  rows: GymEventApplicationStatusRowDTO[];
  onOpenDetail: (row: GymEventApplicationStatusRowDTO) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm lg:hidden">
        조건에 맞는 신청이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3 lg:hidden">
      {rows.map((row) => (
        <li key={row.applicationId}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{row.fighterName}</CardTitle>
              <p className="text-muted-foreground text-xs">{row.divisionLabel}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <ApplicationStatusBadge status={row.applicationStatus} />
                <PaymentStatusBadge status={row.paymentStatus} />
                <StatusBadge
                  variant="outline"
                  label={row.applicationFormStatusLabel}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <CheckInStatusBadge status={row.checkInStatus} />
                <WeighInStatusBadge status={row.weighInStatus} />
                <EligibilityBadge
                  label={row.eligibilityLabel}
                  isEligible={row.isEligibleForBracket}
                  title={row.eligibilityReason}
                />
              </div>
              {row.bracketGenerated ? (
                <p className="text-muted-foreground text-xs">
                  대진: {row.bracketAssigned ? "배정됨" : "미배정"}
                  {row.matchSummary ? ` · ${row.matchSummary}` : ""}
                  {row.resultSummary ? ` · ${row.resultSummary}` : ""}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">대진 미생성</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onOpenDetail(row)}
              >
                상세 보기
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
