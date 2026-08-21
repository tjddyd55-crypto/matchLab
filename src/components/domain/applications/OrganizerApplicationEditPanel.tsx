"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getOrganizerApplicationEditFormAction,
  updateOrganizerApplicationAction,
} from "@/features/applications/actions";
import type { OrganizerApplicationEditFormDTO } from "@/lib/services/application-organizer-lifecycle.service";
import type { OrganizerManualRegistrationOptionsDTO } from "@/lib/services/application.service";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { ApplicationWeightAutoAssign } from "@/components/domain/applications/ApplicationWeightAutoAssign";
import { AthleteInsuranceProfileFields } from "@/components/domain/applications/AthleteInsuranceProfileFields";
import {
  Dialog,
  DialogContent,
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

const fieldClass = ORGANIZER_FIELD_INPUT_CLASS;
const labelClass = "text-muted-foreground mb-1 block text-xs font-medium";

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
    setLoading(true);
    setError(null);
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
    startTransition(async () => {
      const res = await updateOrganizerApplicationAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>신청 수정</DialogTitle>
        </DialogHeader>

        {loading || !form ? (
          <p className="text-muted-foreground text-sm">불러오는 중…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {form.structuralBlockReason ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950">
                {form.structuralBlockReason}
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">체육관 · 선수</p>
                <div className="flex flex-wrap gap-2">
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
                      defaultValue={form.gymName}
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="edit-gender">
                      성별 *
                    </label>
                    <select
                      id="edit-gender"
                      name="gender"
                      required
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
                </div>

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

                <div className="grid gap-3 sm:grid-cols-2">
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
                    <label className={labelClass} htmlFor="edit-guardianPhone">
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
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">경기 · 전적 · 메모</p>
                <div
                  className={cn(
                    form.structuralEditBlocked && "pointer-events-none opacity-60",
                  )}
                >
                  <p className={labelClass}>신청체중 · 체급 *</p>
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
                <div>
                  <label className={labelClass} htmlFor="edit-careerText">
                    운동경력
                  </label>
                  <input
                    id="edit-careerText"
                    name="careerText"
                    className={fieldClass}
                    defaultValue={form.careerText}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="edit-memo">
                    메모
                  </label>
                  <textarea
                    id="edit-memo"
                    name="memo"
                    rows={3}
                    className={cn(fieldClass, "h-auto min-h-[4.5rem] py-2")}
                    defaultValue={form.memo}
                  />
                </div>

                {form.insuranceRrnMasked ? (
                  <p className="text-muted-foreground text-xs">
                    등록된 주민번호: {form.insuranceRrnMasked}
                    <br />
                    변경 시에만 아래에 새 번호를 입력하세요. 비워두면 기존 값을
                    유지합니다.
                  </p>
                ) : null}
                <AthleteInsuranceProfileFields idPrefix="edit" required={false} />
              </div>
            </div>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "저장 중…" : "저장"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                닫기
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
