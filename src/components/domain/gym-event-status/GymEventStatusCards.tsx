"use client";

import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GymEventApplicationStatusRowDTO } from "@/lib/services/gym-event-status.service";
import { matchonCardStackClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export function GymEventStatusCards({
  rows,
  onOpenDetail,
}: {
  rows: GymEventApplicationStatusRowDTO[];
  onOpenDetail: (row: GymEventApplicationStatusRowDTO) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <ul className={cn("flex flex-col lg:hidden", matchonCardStackClass)}>
      {rows.map((row) => (
        <li key={row.applicationId}>
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b bg-muted/15 pb-3">
              <CardTitle className="line-clamp-2 break-words text-base leading-snug">
                {row.fighterName}
              </CardTitle>
              <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                {row.divisionLabel}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
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
                <p className="text-muted-foreground text-xs leading-relaxed">
                  대진: {row.bracketAssigned ? "배정됨" : "미배정"}
                  {row.matchSummary ? ` · ${row.matchSummary}` : ""}
                  {row.resultSummary ? ` · ${row.resultSummary}` : ""}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">대진 미생성</p>
              )}
            </CardContent>
            <CardFooter className="border-t bg-muted/10 pt-3">
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline", size: "field" }),
                  "w-full",
                )}
                onClick={() => onOpenDetail(row)}
              >
                상세 보기
              </button>
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}
