"use client";

import type React from "react";
import { ApplicationWeightAutoAssign } from "@/components/domain/applications/ApplicationWeightAutoAssign";
import { SchoolGradeSelectField } from "@/components/domain/applications/SchoolGradeSelectField";
import { parseApplicantGender } from "@/lib/applicant-excel/normalize";
import type {
  EventApplicationDivisionRowDTO,
  EventApplicationFighterRowDTO,
} from "@/lib/services/application.service";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  getBulkApplicationRowStatusLabel,
  publicApplicationFieldSelectClass,
  resolveBulkApplicationRowMatchonStatus,
} from "@/lib/ui/public-application-ui";
import type { StructuredRecordValue } from "@/components/domain/applications/AthleteInsuranceProfileFields";
import { cn } from "@/lib/utils";

export type FighterRowState = {
  checked: boolean;
  competitionCategory: string;
  discipline: string;
  applicationWeightKg: string;
  schoolGradeSelect: string;
  formAnswers: Record<string, unknown>;
  structuredRecord: StructuredRecordValue;
  careerText: string;
  residentRegistrationNumber: string;
};

type GymBulkApplicationRowProps = {
  fighter: EventApplicationFighterRowDTO;
  divisions: EventApplicationDivisionRowDTO[];
  rowState: FighterRowState;
  onCheckedChange: (checked: boolean) => void;
  onWeightFieldsChange: (patch: {
    competitionCategory?: string;
    discipline?: string;
    applicationWeightKg?: string;
    schoolGradeSelect?: string;
  }) => void;
  formStatus?: React.ReactNode;
};

function formatWeight(kg: number | null): string {
  if (kg == null) return "—";
  return `${kg}kg`;
}

function rowStatusInput(fighter: EventApplicationFighterRowDTO, rowState: FighterRowState) {
  return {
    alreadyApplied: fighter.appliedDivisionIds.length > 0 && false,
    checked: rowState.checked,
    hasDivision: Boolean(
      rowState.competitionCategory && rowState.applicationWeightKg,
    ),
  };
}

function FighterInfo({ fighter }: { fighter: EventApplicationFighterRowDTO }) {
  return (
    <div className="min-w-0">
      <div className="font-medium">{fighter.name}</div>
      <div className="text-muted-foreground text-xs">
        {fighter.fighterCode} · {fighter.recordSummary}
      </div>
    </div>
  );
}

function FighterMeta({ fighter }: { fighter: EventApplicationFighterRowDTO }) {
  return (
    <div className="text-muted-foreground text-xs leading-relaxed">
      <div>
        {fighter.genderLabel} / {fighter.ageGroup} / {formatWeight(fighter.weightKg)}
      </div>
      {fighter.primarySport ? <div>{fighter.primarySport}</div> : null}
    </div>
  );
}

export function GymBulkApplicationTableRow(props: GymBulkApplicationRowProps) {
  const {
    fighter,
    divisions,
    rowState,
    onCheckedChange,
    onWeightFieldsChange,
    formStatus,
  } = props;
  const statusInput = rowStatusInput(fighter, rowState);
  const alreadyApplied = statusInput.alreadyApplied;
  const genderParsed = parseApplicantGender(fighter.gender);

  return (
    <TableRow>
      <TableCell>
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={rowState.checked}
          disabled={alreadyApplied}
          onChange={(e) => onCheckedChange(e.target.checked)}
          aria-label={`${fighter.name} 신청 선택`}
        />
      </TableCell>
      <TableCell>
        <FighterInfo fighter={fighter} />
      </TableCell>
      <TableCell>
        <FighterMeta fighter={fighter} />
      </TableCell>
      <TableCell className="min-w-[240px] whitespace-normal">
        <ApplicationWeightAutoAssign
          divisions={divisions}
          gender={genderParsed.ok ? genderParsed.gender : ""}
          competitionCategory={rowState.competitionCategory}
          discipline={rowState.discipline}
          applicationWeightKg={rowState.applicationWeightKg}
          onCompetitionCategoryChange={(competitionCategory) =>
            onWeightFieldsChange({ competitionCategory })
          }
          onDisciplineChange={(discipline) => onWeightFieldsChange({ discipline })}
          onApplicationWeightChange={(applicationWeightKg) =>
            onWeightFieldsChange({ applicationWeightKg })
          }
          fieldClass={publicApplicationFieldSelectClass}
          labelClass="text-muted-foreground mb-1 block text-[11px] font-medium"
          defaultWeightHintKg={fighter.weightKg}
        />
        <div className="mt-2 max-w-[8rem]">
          <SchoolGradeSelectField
            id={`bulk-grade-${fighter.id}`}
            name={`schoolGradeSelect-${fighter.id}`}
            value={rowState.schoolGradeSelect}
            onChange={(schoolGradeSelect) =>
              onWeightFieldsChange({ schoolGradeSelect })
            }
            className={publicApplicationFieldSelectClass}
            labelClassName="text-muted-foreground mb-1 block text-[11px] font-medium"
          />
        </div>
      </TableCell>
      {formStatus ? <TableCell>{formStatus}</TableCell> : null}
      <TableCell>
        <MatchonStatusBadge
          status={resolveBulkApplicationRowMatchonStatus(statusInput)}
          label={getBulkApplicationRowStatusLabel(statusInput)}
          size="sm"
        />
      </TableCell>
    </TableRow>
  );
}

export function GymBulkApplicationCard(props: GymBulkApplicationRowProps) {
  const {
    fighter,
    divisions,
    rowState,
    onCheckedChange,
    onWeightFieldsChange,
    formStatus,
  } = props;
  const statusInput = rowStatusInput(fighter, rowState);
  const alreadyApplied = statusInput.alreadyApplied;
  const genderParsed = parseApplicantGender(fighter.gender);

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        rowState.checked ? "border-primary/40 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <FighterInfo fighter={fighter} />
          <div className="mt-2">
            <FighterMeta fighter={fighter} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MatchonStatusBadge
            status={resolveBulkApplicationRowMatchonStatus(statusInput)}
            label={getBulkApplicationRowStatusLabel(statusInput)}
            size="sm"
          />
          {formStatus}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <ApplicationWeightAutoAssign
          divisions={divisions}
          gender={genderParsed.ok ? genderParsed.gender : ""}
          competitionCategory={rowState.competitionCategory}
          discipline={rowState.discipline}
          applicationWeightKg={rowState.applicationWeightKg}
          onCompetitionCategoryChange={(competitionCategory) =>
            onWeightFieldsChange({ competitionCategory })
          }
          onDisciplineChange={(discipline) => onWeightFieldsChange({ discipline })}
          onApplicationWeightChange={(applicationWeightKg) =>
            onWeightFieldsChange({ applicationWeightKg })
          }
          fieldClass={publicApplicationFieldSelectClass}
          labelClass="text-muted-foreground mb-1 block text-[11px] font-medium"
          defaultWeightHintKg={fighter.weightKg}
        />
        <SchoolGradeSelectField
          id={`bulk-card-grade-${fighter.id}`}
          name={`schoolGradeSelect-${fighter.id}`}
          value={rowState.schoolGradeSelect}
          onChange={(schoolGradeSelect) =>
            onWeightFieldsChange({ schoolGradeSelect })
          }
          className={publicApplicationFieldSelectClass}
          labelClassName="text-muted-foreground mb-1 block text-[11px] font-medium"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={rowState.checked}
            disabled={alreadyApplied}
            onChange={(e) => onCheckedChange(e.target.checked)}
          />
          이 선수 신청에 포함
        </label>
      </div>
    </div>
  );
}
