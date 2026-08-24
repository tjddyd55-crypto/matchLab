"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { createBulkEventApplicationsAction } from "@/features/applications/actions";
import type {
  BulkApplyToEventSuccessDTO,
  EventApplicationDivisionRowDTO,
  EventApplicationFighterRowDTO,
  EventApplicationFormConfigDTO,
} from "@/lib/services/application.service";
import type { CustomFormFieldDefinition } from "@/lib/application-form/custom-form";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import { ApplicationAgreementChecklist } from "@/components/domain/applications/ApplicationAgreementChecklist";
import { AthleteInsuranceProfileFields } from "@/components/domain/applications/AthleteInsuranceProfileFields";
import type { StructuredRecordValue } from "@/components/domain/applications/AthleteInsuranceProfileFields";
import {
  GymBulkApplicationCard,
  GymBulkApplicationTableRow,
  type FighterRowState,
} from "@/components/domain/applications/GymBulkApplicationRow";
import { GymBulkApplicationResult } from "@/components/domain/applications/GymBulkApplicationResult";
import {
  GymCustomFormFields,
  isCustomFormComplete,
} from "@/components/domain/applications/GymCustomFormFields";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { publicApplicationFieldTextareaClass } from "@/lib/ui/public-application-ui";
import { matchonCompactTableWrapClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

type GymBulkApplicationFormProps = {
  eventId: string;
  divisions: EventApplicationDivisionRowDTO[];
  fighters: EventApplicationFighterRowDTO[];
  streamingAgreementRequired: boolean;
  streamingNoticeText: string | null;
  applicationForm: EventApplicationFormConfigDTO;
};

function initialRowStates(
  fighters: EventApplicationFighterRowDTO[],
): Record<string, FighterRowState> {
  const map: Record<string, FighterRowState> = {};
  for (const fighter of fighters) {
    map[fighter.id] = {
      checked: false,
      competitionCategory: "",
      discipline: "",
      applicationWeightKg:
        fighter.weightKg != null ? String(fighter.weightKg) : "",
      schoolGradeSelect: "",
      formAnswers: {},
      structuredRecord: { totalBouts: 0, wins: null, draws: null, losses: null },
      careerText: "",
      residentRegistrationNumber: "",
    };
  }
  return map;
}

function buildApplicationsPayload(
  fighters: EventApplicationFighterRowDTO[],
  rowStates: Record<string, FighterRowState>,
  customFields: CustomFormFieldDefinition[],
  requireCustomForm: boolean,
) {
  const applications: Array<{
    fighterId: string;
    applicationWeightKg: number;
    competitionCategory: string;
    discipline?: string;
    schoolGradeSelect?: string;
    structuredRecord: StructuredRecordValue;
    recordText?: string;
    careerText?: string;
    residentRegistrationNumber?: string;
    formAnswers?: Record<string, unknown>;
  }> = [];
  for (const fighter of fighters) {
    const state = rowStates[fighter.id];
    if (!state?.checked || !state.competitionCategory || !state.applicationWeightKg) continue;
    const kg = Number(state.applicationWeightKg);
    if (!Number.isFinite(kg) || kg <= 0) continue;
    if (
      requireCustomForm &&
      customFields.length > 0 &&
      !isCustomFormComplete(customFields, state.formAnswers)
    ) {
      continue;
    }
    applications.push({
      fighterId: fighter.id,
      applicationWeightKg: kg,
      competitionCategory: state.competitionCategory,
      discipline: state.discipline || undefined,
      schoolGradeSelect: state.schoolGradeSelect || "",
      structuredRecord: state.structuredRecord,
      recordText: undefined,
      careerText: state.careerText || undefined,
      residentRegistrationNumber: state.residentRegistrationNumber,
      formAnswers:
        requireCustomForm && customFields.length > 0
          ? state.formAnswers
          : undefined,
    });
  }
  return applications;
}

function customFormStatusLabel(
  fields: CustomFormFieldDefinition[],
  answers: Record<string, unknown>,
  checked: boolean,
): { label: string; status: MatchonStatus } {
  if (!checked) return { label: "—", status: "waiting" };
  if (fields.length === 0) return { label: "불필요", status: "application_completed" };
  if (isCustomFormComplete(fields, answers)) {
    return { label: "작성 완료", status: "application_completed" };
  }
  return { label: "작성 필요", status: "application_pending" };
}

export function GymBulkApplicationForm(props: GymBulkApplicationFormProps) {
  const [rowStates, setRowStates] = useState(() =>
    initialRowStates(props.fighters),
  );

  const [state, formAction, isPending] = useActionState(
    createBulkEventApplicationsAction,
    null as ActionResult<BulkApplyToEventSuccessDTO> | null,
  );

  const requireCustomForm = props.applicationForm.mode === "custom";
  const customFields = props.applicationForm.customFields;

  const selectedRows = useMemo(
    () =>
      props.fighters.filter((f) => {
        const s = rowStates[f.id];
        return s?.checked && s.competitionCategory && s.applicationWeightKg;
      }),
    [props.fighters, rowStates],
  );

  const selectedCount = useMemo(
    () =>
      buildApplicationsPayload(
        props.fighters,
        rowStates,
        customFields,
        requireCustomForm,
      ).length,
    [props.fighters, rowStates, customFields, requireCustomForm],
  );

  const applicationsJson = useMemo(
    () =>
      JSON.stringify(
        buildApplicationsPayload(
          props.fighters,
          rowStates,
          customFields,
          requireCustomForm,
        ),
      ),
    [props.fighters, rowStates, customFields, requireCustomForm],
  );

  const updateRow = (
    fighterId: string,
    patch: Partial<FighterRowState>,
  ): void => {
    setRowStates((prev) => ({
      ...prev,
      [fighterId]: { ...prev[fighterId]!, ...patch },
    }));
  };

  if (state?.ok) {
    return <GymBulkApplicationResult result={state.data} />;
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="eventId" value={props.eventId} />
      <input
        type="hidden"
        name="streamingAgreementRequired"
        value={props.streamingAgreementRequired ? "1" : "0"}
      />
      <input type="hidden" name="applicationsJson" value={applicationsJson} />

      {props.applicationForm.mode === "pdf" ? (
        <FeedbackMessage tone="info">
          공식 PDF 신청서가 연결된 대회입니다. 아래 일괄 신청은 경기구분별 일반
          신청·입금 흐름이며, 공식 신청서 묶음과 별도로 진행됩니다.
        </FeedbackMessage>
      ) : props.applicationForm.mode === "custom" ? (
        <Card variant="muted">
          <CardHeader>
            <CardTitle className="text-base">자체 폼형 신청서 연결됨</CardTitle>
            <CardDescription>
              {props.applicationForm.templateTitle ?? "신청서"} — 선택한 선수마다
              아래 항목을 작성한 뒤 일괄 신청해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card variant="muted">
          <CardHeader>
            <CardTitle className="text-base">공식 신청서 템플릿 미연결</CardTitle>
            <CardDescription>
              이 대회에는 신청서 템플릿이 연결되지 않았습니다. 아래에서 선수별
              경기구분을 선택해 일괄 신청할 수 있습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">선수 선택 및 경기구분</CardTitle>
          <CardDescription>
            신청할 선수를 선택하고 경기구분을 지정해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-0 sm:p-0">
      <div className={cn(matchonCompactTableWrapClass, "hidden md:block px-4 pb-4")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">선택</TableHead>
              <TableHead>선수</TableHead>
              <TableHead>성별/연령/체중</TableHead>
              <TableHead>신청 경기구분</TableHead>
              {requireCustomForm ? (
                <TableHead>신청서</TableHead>
              ) : null}
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.fighters.map((fighter) => {
              const rowState = rowStates[fighter.id]!;
              const formStatus = customFormStatusLabel(
                customFields,
                rowState.formAnswers,
                rowState.checked,
              );
              return (
                <GymBulkApplicationTableRow
                  key={fighter.id}
                  fighter={fighter}
                  divisions={props.divisions}
                  rowState={rowState}
                  onCheckedChange={(checked) =>
                    updateRow(fighter.id, { checked })
                  }
                  onWeightFieldsChange={(patch) =>
                    updateRow(fighter.id, patch)
                  }
                  formStatus={
                    requireCustomForm ? (
                      <MatchonStatusBadge
                        status={formStatus.status}
                        label={formStatus.label}
                        size="sm"
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 px-4 pb-4 md:hidden">
        {props.fighters.map((fighter) => {
          const rowState = rowStates[fighter.id]!;
          const formStatus = customFormStatusLabel(
            customFields,
            rowState.formAnswers,
            rowState.checked,
          );
          return (
            <GymBulkApplicationCard
              key={fighter.id}
              fighter={fighter}
              divisions={props.divisions}
              rowState={rowState}
              onCheckedChange={(checked) => updateRow(fighter.id, { checked })}
              onWeightFieldsChange={(patch) =>
                updateRow(fighter.id, patch)
              }
              formStatus={
                requireCustomForm ? (
                  <MatchonStatusBadge
                    status={formStatus.status}
                    label={formStatus.label}
                    size="sm"
                  />
                ) : undefined
              }
            />
          );
        })}
      </div>
        </CardContent>
      </Card>

      {selectedRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">선택 선수 출전 정보</CardTitle>
            <CardDescription>
              전적·운동경력·보험가입 주민번호는 이번 대회 신청에만 저장됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRows.map((fighter) => {
              const rowState = rowStates[fighter.id]!;
              return (
                <div
                  key={fighter.id}
                  className="rounded-xl border border-border/70 bg-muted/20 p-4"
                >
                  <p className="mb-3 text-sm font-medium">{fighter.name}</p>
                  <AthleteInsuranceProfileFields
                    idPrefix={`bulk-${fighter.id}`}
                    recordValue={rowState.structuredRecord}
                    careerValue={rowState.careerText}
                    rrnValue={rowState.residentRegistrationNumber}
                    onRecordChange={(v) =>
                      updateRow(fighter.id, { structuredRecord: v })
                    }
                    onCareerChange={(v) =>
                      updateRow(fighter.id, { careerText: v })
                    }
                    onRrnChange={(v) =>
                      updateRow(fighter.id, { residentRegistrationNumber: v })
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {requireCustomForm && customFields.length > 0 && selectedRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">선택 선수 신청서 작성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          {selectedRows.map((fighter) => {
            const rowState = rowStates[fighter.id]!;
            return (
              <details
                key={fighter.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-4"
                open={selectedRows.length <= 3}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {fighter.name} — 신청서 작성
                </summary>
                <div className="mt-4">
                  <GymCustomFormFields
                    fields={customFields}
                    answers={rowState.formAnswers}
                    onChange={(formAnswers) =>
                      updateRow(fighter.id, { formAnswers })
                    }
                  />
                </div>
              </details>
            );
          })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">동의 및 제출</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
      <div className="md:static">
        <ApplicationAgreementChecklist
          streamingAgreementRequired={props.streamingAgreementRequired}
          streamingNoticeText={props.streamingNoticeText}
        />

        <div className="mt-4 grid gap-2">
          <label className="text-sm font-medium" htmlFor="bulk-memo">
            메모 (선택, 공통)
          </label>
          <textarea
            id="bulk-memo"
            name="memo"
            rows={2}
            maxLength={2000}
            className={publicApplicationFieldTextareaClass}
            placeholder="주최자에게 전달할 참고 사항"
          />
        </div>

        {state && !state.ok ? (
          <FeedbackMessage tone="error" role="alert" className="mt-3">
            {state.error.message}
          </FeedbackMessage>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="submit"
            size="default"
            className="w-full sm:w-auto"
            disabled={selectedCount === 0 || isPending}
          >
            {isPending
              ? "신청 처리 중…"
              : `선택 선수 일괄 신청 (${selectedCount}명)`}
          </Button>
          <p className="text-muted-foreground text-xs">
            선택 {selectedCount}명 · 필수 동의는 신청 시 스냅샷으로 저장됩니다
            {requireCustomForm ? " · 신청서 필수 항목 작성 필요" : ""}
          </p>
        </div>
      </div>
        </CardContent>
      </Card>
    </form>
  );
}
