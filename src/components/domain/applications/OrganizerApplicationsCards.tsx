"use client";

import {
  OrganizerApplicationStatusBadgeToggle,
  OrganizerPaymentDisplayBadge,
} from "@/components/domain/applications/OrganizerApplicationDisplayBadge";
import { OrganizerApplicationRowActions } from "@/components/domain/applications/OrganizerApplicationRowActions";
import { OrganizerAdditionalInfoRowActions } from "@/components/domain/applications/OrganizerAdditionalInfoRowActions";
import { AdditionalInfoStatusBadge } from "@/components/domain/applications/AdditionalInfoStatusBadge";
import { OrganizerManualEntryHint } from "@/components/domain/applications/OrganizerManualEntryHint";
import { OrganizerApplicationsEmptyState } from "@/components/domain/applications/OrganizerApplicationsEmptyState";
import { OrganizerAssignmentStatusBadge } from "@/components/domain/applications/OrganizerAssignmentStatusBadge";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { formatPublicDateTime } from "@/lib/date-display";
import { ListSequenceMobilePrefix } from "@/components/domain/shared/CompactApplicantFilterBar";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { DivisionGenderBadge } from "@/components/domain/shared/DivisionGenderBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displaySequenceNumber } from "@/lib/ui/list-sequence";
import { matchonMobileCardListClass } from "@/lib/ui/matchon-shell-ui";
import type { ResolveOtherDivisionOption } from "@/components/domain/applications/OrganizerResolveOtherDivisionDialog";

const DIVISION_REVIEW_BADGE_CLASS =
  "inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-900";

export function OrganizerApplicationsCards({
  eventId,
  rows,
  selectedIds,
  onToggleSelect,
  sequenceStart = 0,
  emptyMessage = "아직 신청자가 없습니다.",
  emptyDescription,
  divisions = [],
  manualRegistrationOptions,
}: {
  eventId: string;
  rows: OrganizerApplicationRowVM[];
  selectedIds: Set<string>;
  onToggleSelect: (applicationId: string, checked: boolean) => void;
  sequenceStart?: number;
  emptyMessage?: string;
  emptyDescription?: string;
  divisions?: ResolveOtherDivisionOption[];
  manualRegistrationOptions?: import("@/lib/services/application.service").OrganizerManualRegistrationOptionsDTO;
}) {
  if (rows.length === 0) {
    return (
      <div className="md:hidden">
        <OrganizerApplicationsEmptyState
          message={emptyMessage}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className={matchonMobileCardListClass}>
      {rows.map((row, index) => (
        <Card key={row.applicationId} className="rounded-xl border-matchon-border bg-white py-4 shadow-sm">
          <CardHeader className="space-y-2 px-4 py-0">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selectedIds.has(row.applicationId)}
                onCheckedChange={(v) =>
                  onToggleSelect(row.applicationId, v === true)
                }
                aria-label={`${row.fighterName} 선택`}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ListSequenceMobilePrefix
                    sequence={displaySequenceNumber(index, sequenceStart)}
                  />
                  <p className="text-muted-foreground truncate text-xs font-medium">
                    {row.gymName}
                  </p>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <CardTitle className="truncate text-base leading-snug">
                    {row.fighterName}
                  </CardTitle>
                  <DivisionGenderBadge gender={row.division?.gender} short />
                </div>
                <OrganizerManualEntryHint
                  show={row.isOrganizerManualEntry}
                  entrySource={row.entrySource}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-8">
              <OrganizerAssignmentStatusBadge isAssigned={row.isAssigned} />
              <OrganizerPaymentDisplayBadge paymentStatus={row.paymentStatus} />
              <OrganizerApplicationStatusBadgeToggle
                eventId={eventId}
                applicationId={row.applicationId}
                fighterName={row.fighterName}
                applicationStatus={row.applicationStatus}
                cancellationSource={row.cancellationSource}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4 pt-2 text-sm">
            <div title={row.divisionLabel}>
              <DivisionCompactDisplay
                division={row.division}
                fallbackLabel={row.divisionLabel}
                mainClassName="text-xs"
                secondaryClassName="text-[11px]"
              />
              {row.currentDivisionLabel &&
              row.currentDivisionLabel !== row.divisionLabel ? (
                <p className="text-muted-foreground mt-1 text-[10px] leading-snug">
                  신청 체급: {row.divisionLabel}
                  <br />
                  현재 배정: {row.currentDivisionLabel}
                </p>
              ) : null}
              {!row.divisionId ? (
                <p className="text-destructive mt-1 text-[10px]">
                  경기구분 미배정
                </p>
              ) : null}
              {row.divisionReviewRequired ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={DIVISION_REVIEW_BADGE_CLASS}>기타</span>
                  <span className={DIVISION_REVIEW_BADGE_CLASS}>
                    체급 확인 필요
                  </span>
                </div>
              ) : null}
            </div>
            {row.depositorName ? (
              <p className="text-muted-foreground text-xs">
                입금자명 {row.depositorName}
              </p>
            ) : null}
            {row.appliedAt ? (
              <p className="text-muted-foreground text-xs">
                신청일 {formatPublicDateTime(row.appliedAt)}
              </p>
            ) : null}
            {row.recordText ? (
              <p className="text-muted-foreground text-xs">전적 {row.recordText}</p>
            ) : null}
            {row.careerText ? (
              <p className="text-muted-foreground text-xs">
                운동경력 {row.careerText}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              보험동의 {row.insuranceConsentLabel ?? (row.insuranceConsentAgreed ? "동의" : "미입력")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs">추가정보</span>
              <AdditionalInfoStatusBadge
                label={row.additionalInfoLabel}
                tone={row.additionalInfoBadgeTone}
              />
            </div>
            <OrganizerAdditionalInfoRowActions
              eventId={eventId}
              row={row}
            />
            <OrganizerApplicationRowActions
              eventId={eventId}
              row={row}
              divisions={divisions}
              manualRegistrationOptions={manualRegistrationOptions}
              touchFriendly
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
