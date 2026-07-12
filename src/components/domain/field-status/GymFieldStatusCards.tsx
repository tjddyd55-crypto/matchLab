import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { matchonCardStackClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export function GymFieldStatusCards({ rows }: { rows: FieldStatusRowDTO[] }) {
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
                <CheckInStatusBadge status={row.checkInStatus} />
                <WeighInStatusBadge status={row.weighInStatus} />
                <EligibilityBadge
                  label={row.eligibilityLabel}
                  isEligible={row.isEligibleForBracket}
                  title={row.eligibilityReason}
                />
              </div>
              {row.weighInWeightKg != null ? (
                <p className="text-muted-foreground text-xs">
                  실제 체중: {row.weighInWeightKg}kg
                </p>
              ) : null}
              {row.fieldMemo ? (
                <p className="text-muted-foreground text-xs leading-relaxed break-words">
                  메모: {row.fieldMemo}
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="border-t bg-muted/10 pt-3">
              <p className="text-muted-foreground text-xs leading-relaxed">
                읽기 전용 — 수정은 주최자에게 문의해 주세요.
              </p>
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}
