"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FieldFinalResultCell } from "@/components/domain/field-status/FieldFinalResultCell";
import { FieldStatusBracketMatchCards } from "@/components/domain/field-status/FieldStatusBracketMatchCards";
import { FieldStatusBracketPanel } from "@/components/domain/field-status/FieldStatusBracketPanel";
import { FieldStatusPrimaryActions } from "@/components/domain/field-status/FieldStatusPrimaryActions";
import { FieldStatusResetButton } from "@/components/domain/field-status/FieldStatusResetButton";
import {
  FieldMemoForm,
  WeighInWeightInput,
} from "@/components/domain/field-status/FieldStatusApplicationActions";
import {
  DisqualificationReasonForm,
  WeighInFailureResolutionForm,
} from "@/components/domain/field-status/WeighInFailureResolutionForm";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { markDisqualifiedFormAction } from "@/features/field-status/actions";
import { formatDivisionMainLabel } from "@/lib/event-division-fields";
import {
  getFieldProgressStepHint,
  getFieldWeighInStepHint,
  shouldShowFieldReasonSection,
} from "@/lib/field-status-list-display";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import {
  organizerOperationDetailHeaderClass,
  organizerOperationDetailPanelClass,
  organizerOperationSectionClass,
  organizerOperationSectionTitleClass,
} from "@/lib/ui/organizer-operation-ui";

function DetailSection({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className={organizerOperationSectionClass}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={organizerOperationSectionTitleClass}>
          {step}. {title}
        </h3>
        {hint ? (
          <span className="shrink-0 text-xs font-medium text-[#64748B]">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function OrganizerFieldStatusDetailPane({
  row,
  eventId,
  onBack,
  onWeighInSaved,
}: {
  row: FieldStatusRowDTO;
  eventId: string;
  onBack?: () => void;
  onWeighInSaved?: (info: {
    fighterName: string;
    weightKg: number;
    evaluationReason: string;
    autoStatus: import("@/generated/prisma").WeighInStatus | null;
  }) => void;
}) {
  const router = useRouter();
  const { alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const showReason = shouldShowFieldReasonSection(row);
  const [reasonExpanded, setReasonExpanded] = useState(false);
  const reasonVisible = showReason || reasonExpanded;
  const divisionLine = row.division
    ? formatDivisionMainLabel(row.division)
    : row.divisionLabel;
  const statusLine = [row.weighInStatusLabel, row.eligibilityLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      key={row.applicationId}
      className={organizerOperationDetailPanelClass}
    >
      <div className={organizerOperationDetailHeaderClass}>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-base font-bold leading-tight text-[#0F172A]">
            {row.fighterName}
          </h2>
          <p className="text-sm text-[#64748B]">
            {[row.gymName, divisionLine].filter(Boolean).join(" · ")}
          </p>
          {statusLine ? (
            <p className="text-xs text-[#64748B]">{statusLine}</p>
          ) : null}
        </div>
        {onBack ? (
          <Button type="button" size="sm" variant="outline" onClick={onBack}>
            목록으로
          </Button>
        ) : null}
      </div>

      <DetailSection
        step={1}
        title="계체"
        hint={getFieldWeighInStepHint(row.weighInStatus)}
      >
        <div className="flex flex-col gap-2">
          <WeighInWeightInput
            row={row}
            autoFocus
            onSaved={(info) =>
              onWeighInSaved?.({
                fighterName: row.fighterName,
                ...info,
              })
            }
          />
          <FieldStatusPrimaryActions row={row} showDisqualify={false} />
        </div>
      </DetailSection>

      <DetailSection
        step={2}
        title="경기 진행 여부"
        hint={getFieldProgressStepHint(row)}
      >
        <WeighInFailureResolutionForm row={row} />
        {row.weighInFailureResolution === "proceed_with_handicap" ? (
          <p className="text-xs font-medium text-amber-800">
            핸디캡 경기로 진행합니다.
          </p>
        ) : null}
      </DetailSection>

      <section className={organizerOperationSectionClass}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={organizerOperationSectionTitleClass}>
            3. 실격 사유
          </h3>
          {!showReason ? (
            <button
              type="button"
              className="text-xs text-[#64748B] underline-offset-2 hover:underline"
              onClick={() => setReasonExpanded((v) => !v)}
            >
              {reasonExpanded ? "접기" : "펼치기"}
            </button>
          ) : (
            <span className="text-xs font-medium text-rose-700">필요</span>
          )}
        </div>
        {reasonVisible ? (
          <div className="flex flex-col gap-2">
            <DisqualificationReasonForm row={row} />
            {row.checkInStatus !== "disqualified" ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-9 w-fit text-xs"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.set("applicationId", row.applicationId);
                    const res = await markDisqualifiedFormAction(fd);
                    if (!res.ok) {
                      await alert(
                        res.error?.message ?? "실격 처리에 실패했습니다.",
                      );
                      return;
                    }
                    router.refresh();
                  })
                }
              >
                실격 처리
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-[#64748B]">
            미출석·계체 실패·실격·경기 취소 시에만 필수입니다.
          </p>
        )}
      </section>

      <DetailSection step={4} title="대진 현황">
        <FieldFinalResultCell row={row} />
        <FieldStatusBracketMatchCards row={row} eventId={eventId} />
        <FieldStatusBracketPanel row={row} outcomesOnly />
      </DetailSection>

      <DetailSection step={5} title="메모">
        <FieldMemoForm row={row} />
      </DetailSection>

      <section className="flex flex-col gap-2 rounded-[10px] border border-rose-200 bg-rose-50/40 p-3">
        <h3 className="text-sm font-bold text-rose-900">6. 관리</h3>
        <FieldStatusResetButton row={row} />
      </section>
    </div>
  );
}
