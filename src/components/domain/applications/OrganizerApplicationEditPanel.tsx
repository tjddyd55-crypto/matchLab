"use client";

import { useEffect, useState, useTransition } from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import { useRouter } from "next/navigation";
import {
  getOrganizerApplicationEditFormAction,
  updateOrganizerApplicationAction,
} from "@/features/applications/actions";
import type { OrganizerApplicationEditFormDTO } from "@/lib/services/application-organizer-lifecycle.service";
import type { OrganizerManualRegistrationOptionsDTO } from "@/lib/services/application.service";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { ApplicationWeightAutoAssign } from "@/components/domain/applications/ApplicationWeightAutoAssign";
import { SchoolGradeSelectField } from "@/components/domain/applications/SchoolGradeSelectField";
import { StructuredRecordFields } from "@/components/domain/fighters/StructuredRecordFields";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { INSURANCE_PII_CONSENT_TEXT } from "@/lib/athlete-application/insurance-consent";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ORGANIZER_FIELD_INPUT_CLASS } from "@/lib/organizer-dashboard-layout";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = [
  { value: "male", label: "남" },
  { value: "female", label: "여" },
] as const;

/** DialogContent 기본 sm:max-w-sm 을 확실히 이김 (twMerge / CSS 순서 이슈 대비). */
const EDIT_DIALOG_WIDTH = "min(1040px, calc(100vw - 48px))";

const fieldClass = ORGANIZER_FIELD_INPUT_CLASS;
const labelClass = "text-muted-foreground mb-1 block text-xs font-medium";
const sectionTitleClass =
  "text-matchon-text-primary mb-2 text-xs font-semibold tracking-wide";

export function OrganizerApplicationEditPanel({
  open,
  onOpenChange,
  eventId,
  applicationId,
  options,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  applicationId: string;
  options: OrganizerManualRegistrationOptionsDTO;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<OrganizerApplicationEditFormDTO | null>(null);
  const [gender, setGender] = useState("");
  const [competitionCategory, setCompetitionCategory] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [applicationWeightKg, setApplicationWeightKg] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [manualDivisionId, setManualDivisionId] = useState("");
  const [gymMode, setGymMode] = useState<"existing" | "manual">("manual");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    scheduleEffectStateUpdate(() => {
      setLoading(true);
      setError(null);
    });
    void getOrganizerApplicationEditFormAction(applicationId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setForm(res.data);
      setGender(res.data.gender);
      setCompetitionCategory(res.data.competitionCategory);
      setDiscipline(res.data.discipline);
      setApplicationWeightKg(res.data.applicationWeightKg);
      setManualDivisionId(res.data.divisionId ?? "");
      setManualOverride(Boolean(res.data.divisionId));
      setGymMode(res.data.gymMode);
    });
    return () => {
      cancelled = true;
    };
  }, [open, applicationId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("eventId", eventId);
    fd.set("applicationId", applicationId);
    fd.set("gymMode", gymMode);
    // disabled structural fields are omitted from FormData — force locked values.
    if (form?.structuralEditBlocked) {
      fd.set("gender", gender);
      fd.set("competitionCategory", competitionCategory);
      if (discipline) fd.set("discipline", discipline);
      else fd.delete("discipline");
      fd.set("applicationWeightKg", applicationWeightKg);
      if (manualDivisionId) {
        fd.set("manualDivisionOverride", "on");
        fd.set("divisionId", manualDivisionId);
      }
    }
    startTransition(async () => {
      try {
        const res = await updateOrganizerApplicationAction(fd);
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error && err.message.trim()
            ? err.message
            : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setError(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layout="shell"
        style={{
          width: EDIT_DIALOG_WIDTH,
          maxWidth: "1040px",
        }}
        className={cn(
          "max-h-[82vh]",
          // Dialog 기본: w-full max-w-[calc(100%-2rem)] sm:max-w-sm → 강제 덮어쓰기
          "!w-[min(1040px,calc(100vw-48px))] !max-w-[1040px]",
          "sm:!max-w-[1040px]",
        )}
      >
        <DialogHeader>
          <DialogTitle>신청 수정</DialogTitle>
        </DialogHeader>

        {loading || !form ? (
          <DialogBody className="space-y-3">
            <p className="text-muted-foreground text-sm">불러오는 중…</p>
            {error ? (
              <FeedbackMessage tone="error" role="alert">
                {error}
              </FeedbackMessage>
            ) : null}
          </DialogBody>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/*
              structuralEditBlocked 시 <select disabled> 는 FormData에서 제외된다.
              hidden 으로 잠긴 gender 를 항상 제출한다.
            */}
            {form.structuralEditBlocked ? (
              <input type="hidden" name="gender" value={gender} />
            ) : null}
            <DialogBody className="overflow-x-hidden">
              {form.structuralBlockReason ? (
                <p
                  className={cn(
                    "mb-3 rounded-md border px-3 py-2 text-xs",
                    form.structuralEditBlocked
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-950"
                      : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {form.structuralBlockReason}
                </p>
              ) : null}

              <div
                className={cn(
                  "grid gap-5",
                  "grid-cols-1",
                  "sm:grid-cols-2",
                  "min-[900px]:grid-cols-3",
                )}
              >
                {/* 1열 — 체육관 / 선수 */}
                <section className="min-w-0 space-y-2.5">
                  <p className={sectionTitleClass}>체육관 · 선수</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={gymMode === "existing" ? "default" : "outline"}
                      disabled={options.gyms.length === 0}
                      onClick={() => setGymMode("existing")}
                    >
                      기존 체육관
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={gymMode === "manual" ? "default" : "outline"}
                      onClick={() => setGymMode("manual")}
                    >
                      소속명 직접 입력
                    </Button>
                  </div>

                  {gymMode === "existing" ? (
                    <div>
                      <label className={labelClass} htmlFor="edit-gymId">
                        체육관 *
                      </label>
                      <select
                        id="edit-gymId"
                        name="gymId"
                        required
                        className={fieldClass}
                        defaultValue={form.gymId ?? ""}
                      >
                        <option value="" disabled>
                          선택
                        </option>
                        {options.gyms.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className={labelClass} htmlFor="edit-gymName">
                        체육관명 *
                      </label>
                      <input
                        id="edit-gymName"
                        name="gymName"
                        required
                        className={fieldClass}
                        defaultValue={
                          form.gymName === "—" ? "" : form.gymName
                        }
                      />
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        외부 소속명은 Gym을 생성하지 않고 snapshot만 수정합니다.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className={labelClass} htmlFor="edit-fighterName">
                      선수 이름 *
                    </label>
                    <input
                      id="edit-fighterName"
                      name="fighterName"
                      required
                      className={fieldClass}
                      defaultValue={form.fighterName}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass} htmlFor="edit-gender">
                        성별 *
                      </label>
                      <select
                        id="edit-gender"
                        name={
                          form.structuralEditBlocked ? undefined : "gender"
                        }
                        required={!form.structuralEditBlocked}
                        className={fieldClass}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        disabled={form.structuralEditBlocked}
                      >
                        <option value="" disabled>
                          선택
                        </option>
                        {GENDER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <SchoolGradeSelectField
                      id="edit-schoolGradeSelect"
                      name="schoolGradeSelect"
                      defaultValue={form.schoolGradeSelect}
                      className={fieldClass}
                      labelClassName={labelClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="edit-birthDate">
                      생년월일
                    </label>
                    <AppDateInput
                      id="edit-birthDate"
                      name="birthDate"
                      disallowFuture
                      defaultValue={form.birthDate ?? undefined}
                      aria-label="생년월일"
                      inputClassName={fieldClass}
                    />
                  </div>
                </section>

                {/* 2열 — 경기 / 체급 / 전적 */}
                <section className="min-w-0 space-y-2.5">
                  <p className={sectionTitleClass}>경기 · 체급 · 전적</p>
                  <div
                    className={cn(
                      form.structuralEditBlocked &&
                        "pointer-events-none opacity-60",
                    )}
                  >
                    <ApplicationWeightAutoAssign
                      divisions={options.divisions}
                      gender={
                        gender === "female"
                          ? "female"
                          : gender === "male"
                            ? "male"
                            : ""
                      }
                      competitionCategory={competitionCategory}
                      discipline={discipline}
                      applicationWeightKg={applicationWeightKg}
                      onCompetitionCategoryChange={setCompetitionCategory}
                      onDisciplineChange={setDiscipline}
                      onApplicationWeightChange={setApplicationWeightKg}
                      fieldClass={fieldClass}
                      labelClass={labelClass}
                      hiddenInputNames={{
                        competitionCategory: "competitionCategory",
                        discipline: "discipline",
                        applicationWeightKg: "applicationWeightKg",
                        divisionId: "divisionId",
                      }}
                      showManualOverride
                      manualOverride={manualOverride}
                      onManualOverrideChange={setManualOverride}
                      manualDivisionId={manualDivisionId}
                      onManualDivisionIdChange={setManualDivisionId}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="edit-recordText">
                      전적
                    </label>
                    <input
                      id="edit-recordText"
                      name="recordText"
                      className={fieldClass}
                      defaultValue={form.recordText}
                    />
                  </div>

                  <StructuredRecordFields
                    key={`${form.applicationId}-record`}
                    idPrefix="edit"
                    defaultValue={form.record}
                  />

                  <div>
                    <label className={labelClass} htmlFor="edit-careerText">
                      운동경력
                    </label>
                    <input
                      id="edit-careerText"
                      name="careerText"
                      className={fieldClass}
                      defaultValue={form.careerText}
                      maxLength={200}
                      placeholder="예: 킥복싱 2년"
                    />
                  </div>
                </section>

                {/* 3열 — 연락처 / 보호자 / PII / 메모 */}
                <section className="min-w-0 space-y-2.5 sm:max-[899px]:col-span-2 min-[900px]:col-span-1">
                  <p className={sectionTitleClass}>
                    연락처 · 보호자 · 개인정보 · 메모
                  </p>
                  <div>
                    <label className={labelClass} htmlFor="edit-phone">
                      연락처
                    </label>
                    <input
                      id="edit-phone"
                      name="phone"
                      className={fieldClass}
                      defaultValue={form.phone}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass} htmlFor="edit-guardianName">
                        보호자 이름
                      </label>
                      <input
                        id="edit-guardianName"
                        name="guardianName"
                        className={fieldClass}
                        defaultValue={form.guardianName}
                      />
                    </div>
                    <div>
                      <label
                        className={labelClass}
                        htmlFor="edit-guardianPhone"
                      >
                        보호자 연락처
                      </label>
                      <input
                        id="edit-guardianPhone"
                        name="guardianPhone"
                        className={fieldClass}
                        defaultValue={form.guardianPhone}
                      />
                    </div>
                  </div>

                  {form.insuranceRrnMasked ? (
                    <p className="text-muted-foreground text-[11px] leading-snug">
                      등록된 주민번호: {form.insuranceRrnMasked}. 변경 시에만
                      아래에 새 번호를 입력하세요. 비워두면 기존 값을 유지합니다.
                    </p>
                  ) : null}

                  <div>
                    <label className={labelClass} htmlFor="edit-rrn">
                      주민등록번호
                    </label>
                    <input
                      id="edit-rrn"
                      name="residentRegistrationNumber"
                      className={fieldClass}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="000000-0000000"
                      maxLength={14}
                    />
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      대회 참가자 보험 가입을 위해 수집합니다.
                    </p>
                    <p className="text-muted-foreground text-[11px] whitespace-pre-wrap">
                      {INSURANCE_PII_CONSENT_TEXT}
                    </p>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="edit-memo">
                      메모
                    </label>
                    <textarea
                      id="edit-memo"
                      name="memo"
                      rows={3}
                      className={cn(
                        fieldClass,
                        "h-auto min-h-[4.5rem] max-h-28 resize-y py-2",
                      )}
                      defaultValue={form.memo}
                    />
                  </div>
                </section>
              </div>
            </DialogBody>

            <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col sm:items-stretch">
              {error ? (
                <FeedbackMessage tone="error" role="alert" className="text-sm">
                  저장하지 못했습니다. {error}
                </FeedbackMessage>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => onOpenChange(false)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "저장 중…" : "저장"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
