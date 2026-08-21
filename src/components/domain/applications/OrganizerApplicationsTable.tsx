"use client";

import type {
  ApplicationCancellationSource,
  ApplicationStatus,
  PaymentStatus,
} from "@/generated/prisma";
import type {
  ApplicationFormMode,
  CustomFormSnapshot,
} from "@/lib/application-form/custom-form";
import {
  OrganizerApplicationStatusBadge,
  OrganizerPaymentDisplayBadge,
} from "@/components/domain/applications/OrganizerApplicationDisplayBadge";
import { OrganizerApplicationRowActions } from "@/components/domain/applications/OrganizerApplicationRowActions";
import { OrganizerAdditionalInfoRowActions } from "@/components/domain/applications/OrganizerAdditionalInfoRowActions";
import { AdditionalInfoStatusBadge } from "@/components/domain/applications/AdditionalInfoStatusBadge";
import { OrganizerManualEntryHint } from "@/components/domain/applications/OrganizerManualEntryHint";
import { OrganizerApplicationsEmptyState } from "@/components/domain/applications/OrganizerApplicationsEmptyState";
import {
  ListSequenceCell,
} from "@/components/domain/shared/CompactApplicantFilterBar";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { DivisionGenderBadge } from "@/components/domain/shared/DivisionGenderBadge";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import { MATCH_CATEGORY_WITH_WEIGHT_LABEL } from "@/lib/ui-labels/match-category";
import { cn } from "@/lib/utils";
import {
  listTableHeaderCellCenterClass,
  listTableHeaderCellStartClass,
  listTableHeaderRowClass,
} from "@/lib/ui/list-table-styles";
import { displaySequenceNumber } from "@/lib/ui/list-sequence";
import { matchonCompactTableWrapClass } from "@/lib/ui/matchon-shell-ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResolveOtherDivisionOption } from "@/components/domain/applications/OrganizerResolveOtherDivisionDialog";

const DIVISION_REVIEW_BADGE_CLASS =
  "inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-900";

export type OrganizerApplicationRowVM = {
  applicationId: string;
  fighterId: string;
  fighterProfileImageUrl: string | null;
  fighterName: string;
  gymId: string;
  gymName: string;
  /** REGISTERED면 division id, OTHER면 null */
  divisionId: string | null;
  divisionLabel: string;
  division: EventDivisionDisplayInput | null;
  applicationStatus: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  depositorName: string | null;
  memo: string | null;
  appliedAt: string | null;
  createdAt: string;
  guardianConsentRequired: boolean;
  consentSummaryLabel: string;
  consentFilterKey: string;
  customFormSnapshot: CustomFormSnapshot | null;
  applicationFormMode: ApplicationFormMode;
  isOrganizerManualEntry: boolean;
  entrySource?: "organizer_manual" | "external_link" | null;
  recordText?: string | null;
  careerText?: string | null;
  insuranceRrnMasked?: string | null;
  insuranceConsentAgreed?: boolean;
  insuranceConsentLabel?: string;
  additionalInfoStatus: import("@/generated/prisma").AdditionalInfoStatus;
  additionalInfoLabel: string;
  additionalInfoBadgeTone: import("@/lib/additional-info/completion").AdditionalInfoBadgeTone;
  additionalInfoCompletedAt: string | null;
  contactMissing: boolean;
  additionalInfoContactCode:
    | "MISSING_ATHLETE_PHONE"
    | "MISSING_GUARDIAN_PHONE"
    | null;
  additionalInfoRecipientMasked?: string | null;
  /** 요청 snapshot vs Fighter live 연락처 불일치 */
  recipientPhoneDrift?: boolean;
  liveRecipientMasked?: string | null;
  isMinor: boolean;
  divisionReviewRequired: boolean;
  requestedDivisionText: string | null;
  applicationWeightKg: number | null;
  fighterGender: string;
};

export function OrganizerApplicationsTable({
  eventId,
  rows,
  selectedIds,
  onToggleSelect,
  sequenceStart = 0,
  emptyMessage = "아직 신청자가 없습니다.",
  emptyDescription,
  divisions = [],
}: {
  eventId: string;
  rows: OrganizerApplicationRowVM[];
  selectedIds: Set<string>;
  onToggleSelect: (applicationId: string, checked: boolean) => void;
  sequenceStart?: number;
  emptyMessage?: string;
  emptyDescription?: string;
  divisions?: ResolveOtherDivisionOption[];
}) {
  if (rows.length === 0) {
    return (
      <div className="hidden min-w-0 2xl:block">
        <OrganizerApplicationsEmptyState
          message={emptyMessage}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className={cn(matchonCompactTableWrapClass, "hidden min-w-0 2xl:block")}>
      <Table className="w-full table-fixed">
        <TableHeader className={listTableHeaderRowClass}>
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[3%]")} />
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[5%]")}>
              순번
            </TableHead>
            <TableHead className={cn(listTableHeaderCellStartClass, "w-[10%]")}>
              체육관
            </TableHead>
            <TableHead className={cn(listTableHeaderCellStartClass, "w-[12%]")}>
              선수명
            </TableHead>
            <TableHead className={cn(listTableHeaderCellStartClass, "w-[18%]")}>
              {MATCH_CATEGORY_WITH_WEIGHT_LABEL}
            </TableHead>
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[10%]")}>
              입금내역
            </TableHead>
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[10%]")}>
              상태
            </TableHead>
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[8%]")}>
              추가정보
            </TableHead>
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[18%]")}>
              상태입력/처리
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.applicationId} className="border-b border-matchon-border/60 hover:bg-matchon-surface/50">
              <TableCell className="align-middle">
                <Checkbox
                  checked={selectedIds.has(row.applicationId)}
                  onCheckedChange={(v) =>
                    onToggleSelect(row.applicationId, v === true)
                  }
                  aria-label={`${row.fighterName} 선택`}
                />
              </TableCell>
              <TableCell className="align-middle text-center">
                <ListSequenceCell
                  sequence={displaySequenceNumber(index, sequenceStart)}
                />
              </TableCell>
              <TableCell className="align-middle">
                <div className="truncate text-sm">{row.gymName}</div>
              </TableCell>
              <TableCell className="align-middle">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {row.fighterName}
                  </span>
                  <DivisionGenderBadge gender={row.division?.gender} short />
                </div>
                <OrganizerManualEntryHint
                  show={row.isOrganizerManualEntry}
                  entrySource={row.entrySource}
                />
              </TableCell>
              <TableCell className="align-top">
                <DivisionCompactDisplay
                  division={row.division}
                  fallbackLabel={row.divisionLabel}
                  mainClassName="text-xs"
                  secondaryClassName="text-[11px]"
                />
                {row.divisionReviewRequired ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className={DIVISION_REVIEW_BADGE_CLASS}>기타</span>
                    <span className={DIVISION_REVIEW_BADGE_CLASS}>
                      체급 확인 필요
                    </span>
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="align-top text-center">
                <OrganizerPaymentDisplayBadge paymentStatus={row.paymentStatus} />
                {row.depositorName ? (
                  <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                    {row.depositorName}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="align-top text-center">
                <OrganizerApplicationStatusBadge
                  applicationStatus={row.applicationStatus}
                  cancellationSource={row.cancellationSource}
                />
              </TableCell>
              <TableCell className="align-top text-center">
                <div className="flex flex-col items-center gap-1">
                  <AdditionalInfoStatusBadge
                    label={row.additionalInfoLabel}
                    tone={row.additionalInfoBadgeTone}
                  />
                  <OrganizerAdditionalInfoRowActions
                    eventId={eventId}
                    row={row}
                    compact
                  />
                </div>
              </TableCell>
              <TableCell className="align-top text-center">
                <div className="flex justify-center">
                  <OrganizerApplicationRowActions
                    eventId={eventId}
                    row={row}
                    divisions={divisions}
                    compact
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
