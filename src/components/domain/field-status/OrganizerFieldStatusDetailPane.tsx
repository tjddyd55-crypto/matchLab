"use client";

import Link from "next/link";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { FieldFinalResultCell } from "@/components/domain/field-status/FieldFinalResultCell";
import { FieldStatusBracketPanel } from "@/components/domain/field-status/FieldStatusBracketPanel";
import { FieldStatusCheckInActions } from "@/components/domain/field-status/FieldStatusCheckInActions";
import { FieldStatusPrimaryActions } from "@/components/domain/field-status/FieldStatusPrimaryActions";
import { FieldStatusResetButton } from "@/components/domain/field-status/FieldStatusResetButton";
import {
  FieldMemoForm,
  WeighInWeightForm,
} from "@/components/domain/field-status/FieldStatusApplicationActions";
import {
  DisqualificationReasonForm,
  WeighInFailureResolutionForm,
} from "@/components/domain/field-status/WeighInFailureResolutionForm";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export function OrganizerFieldStatusDetailPane({
  row,
  eventId,
  onBack,
}: {
  row: FieldStatusRowDTO;
  eventId: string;
  onBack?: () => void;
}) {
  const relatedMatch = row.bracketAssignments[0];

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-matchon-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-bold text-matchon-text-primary">
            {row.fighterName}
          </h2>
          <p className="text-sm text-matchon-text-secondary">{row.gymName}</p>
          <DivisionCompactDisplay
            division={row.division}
            mainClassName="text-sm"
            secondaryClassName="text-xs"
          />
        </div>
        {onBack ? (
          <Button type="button" size="sm" variant="outline" onClick={onBack}>
            목록으로
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CheckInStatusBadge status={row.checkInStatus} />
        <WeighInStatusBadge status={row.weighInStatus} />
        <EligibilityBadge
          label={row.eligibilityLabel}
          isEligible={row.isEligibleForBracket}
          title={row.eligibilityReason}
        />
      </div>

      <FieldStatusCheckInActions row={row} />

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">계체</p>
        <WeighInWeightForm row={row} />
        <FieldStatusPrimaryActions row={row} />
        <FieldMemoForm row={row} />
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">경기 진행 여부</p>
        <WeighInFailureResolutionForm row={row} />
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">실격·미출석 사유</p>
        <DisqualificationReasonForm row={row} />
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">결과</p>
        <FieldFinalResultCell row={row} />
        <FieldStatusResetButton row={row} />
      </div>

      <FieldStatusBracketPanel row={row} />

      {relatedMatch ? (
        <div className="space-y-2 rounded-lg border border-dashed border-matchon-border bg-matchon-surface/40 p-3">
          <p className="text-sm font-medium">관련 경기</p>
          <p className="text-sm">
            {relatedMatch.matchLabel}
            {relatedMatch.opponentName
              ? ` · vs ${relatedMatch.opponentName}`
              : ""}
          </p>
          <Link
            href={`/organizer/events/${eventId}/operation`}
            className="inline-flex h-8 items-center justify-center rounded-md border border-matchon-border bg-white px-3 text-xs font-semibold text-matchon-text-primary hover:bg-matchon-surface"
          >
            경기 운영에서 보기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
