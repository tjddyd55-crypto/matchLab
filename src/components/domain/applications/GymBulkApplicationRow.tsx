"use client";

import type React from "react";
import { useMemo } from "react";
import {
  divisionMismatchWarnings,
  isDivisionRecommendedForFighter,
} from "@/lib/applications/division-fighter-match";
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
import { cn } from "@/lib/utils";

export type FighterRowState = {
  checked: boolean;
  divisionId: string;
  formAnswers: Record<string, unknown>;
  recordText: string;
  careerText: string;
  residentRegistrationNumber: string;
};

type GymBulkApplicationRowProps = {
  fighter: EventApplicationFighterRowDTO;
  divisions: EventApplicationDivisionRowDTO[];
  rowState: FighterRowState;
  onCheckedChange: (checked: boolean) => void;
  onDivisionChange: (divisionId: string) => void;
  formStatus?: React.ReactNode;
};

function formatWeight(kg: number | null): string {
  if (kg == null) return "—";
  return `${kg}kg`;
}

function buildDivisionOptions(
  fighter: EventApplicationFighterRowDTO,
  divisions: EventApplicationDivisionRowDTO[],
) {
  const recommended: EventApplicationDivisionRowDTO[] = [];
  const others: EventApplicationDivisionRowDTO[] = [];

  for (const division of divisions) {
    if (isDivisionRecommendedForFighter(fighter, division)) {
      recommended.push(division);
    } else {
      others.push(division);
    }
  }

  return { recommended, others };
}

function rowStatusInput(fighter: EventApplicationFighterRowDTO, rowState: FighterRowState) {
  return {
    alreadyApplied: Boolean(
      rowState.divisionId && fighter.appliedDivisionIds.includes(rowState.divisionId),
    ),
    checked: rowState.checked,
    hasDivision: Boolean(rowState.divisionId),
  };
}

function DivisionSelect({
  fighter,
  divisions,
  value,
  disabled,
  onChange,
}: {
  fighter: EventApplicationFighterRowDTO;
  divisions: EventApplicationDivisionRowDTO[];
  value: string;
  disabled?: boolean;
  onChange: (divisionId: string) => void;
}) {
  const { recommended, others } = useMemo(
    () => buildDivisionOptions(fighter, divisions),
    [fighter, divisions],
  );

  const selectedDivision = divisions.find((d) => d.id === value);
  const warnings =
    selectedDivision && value
      ? divisionMismatchWarnings(fighter, selectedDivision)
      : [];

  return (
    <div className="grid gap-1">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={publicApplicationFieldSelectClass}
        aria-label={`${fighter.name} 신청 경기구분`}
      >
        <option value="">경기구분 선택</option>
        {recommended.length > 0 ? (
          <optgroup label="추천 경기구분">
            {recommended.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {others.length > 0 ? (
          <optgroup label="전체 경기구분">
            {others.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {warnings.length > 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {warnings.join(" ")}
        </p>
      ) : null}
    </div>
  );
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
    onDivisionChange,
    formStatus,
  } = props;
  const statusInput = rowStatusInput(fighter, rowState);
  const alreadyApplied = statusInput.alreadyApplied;

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
      <TableCell className="min-w-[220px] whitespace-normal">
        <DivisionSelect
          fighter={fighter}
          divisions={divisions}
          value={rowState.divisionId}
          disabled={!rowState.checked || alreadyApplied}
          onChange={onDivisionChange}
        />
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
    onDivisionChange,
    formStatus,
  } = props;
  const statusInput = rowStatusInput(fighter, rowState);
  const alreadyApplied = statusInput.alreadyApplied;

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
        <DivisionSelect
          fighter={fighter}
          divisions={divisions}
          value={rowState.divisionId}
          disabled={!rowState.checked || alreadyApplied}
          onChange={onDivisionChange}
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
