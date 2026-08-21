"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveOtherDivisionAction } from "@/features/applications/actions";
import { formatFighterGenderLabel } from "@/lib/applications/division-fighter-match";
import { parseApplicantGender } from "@/lib/applicant-excel/normalize";
import { formatDivisionWeightChipLabel } from "@/lib/event-division-fields";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formControlFieldClass,
  formControlLabelClass,
} from "@/lib/ui/form-control-ui";

export type ResolveOtherDivisionOption = {
  id: string;
  label: string;
  gender: string | null;
  ageGroup: string | null;
  weightClass?: string | null;
  weightClassName?: string | null;
  weightLimitText?: string | null;
};

function divisionMatchesGender(
  divisionGender: string | null,
  athleteGender: "male" | "female",
): boolean {
  const raw = (divisionGender ?? "").trim();
  if (!raw) return true;
  const folded = raw.toLowerCase();
  if (folded === "mixed" || raw === "혼성") return true;
  const parsed = parseApplicantGender(raw);
  return parsed.ok && parsed.gender === athleteGender;
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const t = (v ?? "").trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

function weightOptionLabel(d: ResolveOtherDivisionOption): string {
  return (
    formatDivisionWeightChipLabel(d) ||
    d.label
  );
}

export function OrganizerResolveOtherDivisionDialog({
  open,
  onOpenChange,
  eventId,
  applicationId,
  fighterName,
  gender,
  requestedDivisionText,
  applicationWeightKg,
  recordText,
  careerText,
  divisions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  applicationId: string;
  fighterName: string;
  gender: string;
  requestedDivisionText: string | null;
  applicationWeightKg?: number | null;
  recordText?: string | null;
  careerText?: string | null;
  divisions: ResolveOtherDivisionOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ageGroup, setAgeGroup] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsedGender = parseApplicantGender(gender);
  const athleteGender = parsedGender.ok ? parsedGender.gender : null;

  const genderFiltered = useMemo(() => {
    if (!athleteGender) return divisions;
    return divisions.filter((d) =>
      divisionMatchesGender(d.gender, athleteGender),
    );
  }, [divisions, athleteGender]);

  const ageGroupOptions = useMemo(
    () => uniqueSorted(genderFiltered.map((d) => d.ageGroup)),
    [genderFiltered],
  );

  const weightOptions = useMemo(() => {
    if (!ageGroup.trim()) return [];
    return genderFiltered.filter(
      (d) => (d.ageGroup ?? "").trim() === ageGroup.trim(),
    );
  }, [genderFiltered, ageGroup]);

  function resetForm() {
    setAgeGroup("");
    setDivisionId("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function submit() {
    if (!divisionId) {
      setError("체급을 선택해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await resolveOtherDivisionAction(
        applicationId,
        divisionId,
        eventId,
      );
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>체급 지정</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <dl className="grid gap-2 rounded-lg border border-matchon-border/70 bg-matchon-surface/40 p-3 text-xs">
            <div className="flex gap-2">
              <dt className="text-muted-foreground shrink-0 w-24">선수명</dt>
              <dd className="min-w-0 font-medium">{fighterName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground shrink-0 w-24">성별</dt>
              <dd>{formatFighterGenderLabel(gender)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground shrink-0 w-24">기타 요청</dt>
              <dd className="min-w-0 whitespace-pre-wrap">
                {requestedDivisionText?.trim() || "—"}
              </dd>
            </div>
            {applicationWeightKg != null ? (
              <div className="flex gap-2">
                <dt className="text-muted-foreground shrink-0 w-24">신청체중</dt>
                <dd>{applicationWeightKg}kg</dd>
              </div>
            ) : null}
            {recordText?.trim() ? (
              <div className="flex gap-2">
                <dt className="text-muted-foreground shrink-0 w-24">전적</dt>
                <dd className="min-w-0">{recordText}</dd>
              </div>
            ) : null}
            {careerText?.trim() ? (
              <div className="flex gap-2">
                <dt className="text-muted-foreground shrink-0 w-24">운동경력</dt>
                <dd className="min-w-0">{careerText}</dd>
              </div>
            ) : null}
          </dl>

          <label className="block text-xs">
            <span className={formControlLabelClass}>경기구분 *</span>
            <select
              className={formControlFieldClass}
              value={ageGroup}
              onChange={(e) => {
                setAgeGroup(e.target.value);
                setDivisionId("");
              }}
            >
              <option value="">선택…</option>
              {ageGroupOptions.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs">
            <span className={formControlLabelClass}>체급 *</span>
            <select
              className={formControlFieldClass}
              value={divisionId}
              disabled={!ageGroup}
              onChange={(e) => setDivisionId(e.target.value)}
            >
              <option value="">
                {ageGroup ? "선택…" : "경기구분을 먼저 선택"}
              </option>
              {weightOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {weightOptionLabel(d)}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <FeedbackMessage tone="error" role="alert" className="text-xs">
              {error}
            </FeedbackMessage>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            닫기
          </Button>
          <Button
            type="button"
            size="default"
            disabled={pending || !divisionId}
            onClick={() => void submit()}
          >
            {pending ? "저장 중…" : "체급 지정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
