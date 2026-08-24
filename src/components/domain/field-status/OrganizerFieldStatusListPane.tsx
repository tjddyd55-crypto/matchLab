"use client";

import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { ListSequenceMobilePrefix } from "@/components/domain/shared/CompactApplicantFilterBar";
import {
  getFieldProgressBadgeLabel,
  getFieldStatusListCardClass,
  getFieldStatusListTone,
  getFieldWeighInBadgeLabel,
} from "@/lib/field-status-list-display";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { organizerOperationStatusBadgeClass } from "@/lib/ui/organizer-operation-ui";
import { displaySequenceNumber } from "@/lib/ui/list-sequence";
import { cn } from "@/lib/utils";

function ListStatusChip({
  label,
  tone,
  className,
}: {
  label: string;
  tone: "neutral" | "ok" | "warn" | "danger" | "accent";
  className?: string;
}) {
  return (
    <span
      className={cn(
        organizerOperationStatusBadgeClass,
        tone === "ok" && "border-emerald-300 bg-emerald-50 text-emerald-800",
        tone === "warn" && "border-orange-300 bg-orange-50 text-orange-900",
        tone === "danger" && "border-rose-300 bg-rose-50 text-rose-900",
        tone === "accent" && "border-amber-300 bg-amber-50 text-amber-900",
        tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-600",
        className,
      )}
    >
      {label}
    </span>
  );
}

function weighTone(
  status: FieldStatusRowDTO["weighInStatus"],
): "neutral" | "ok" | "warn" {
  if (status === "pass" || status === "manual_pass") return "ok";
  if (status === "fail" || status === "manual_fail") return "warn";
  return "neutral";
}

function progressTone(label: string): "ok" | "warn" | "danger" | "accent" {
  if (label === "출전 확정") return "ok";
  if (label === "핸디캡 경기") return "accent";
  if (label === "경기취소" || label === "실격" || label === "미출석" || label === "철회") {
    return "danger";
  }
  return "warn";
}

export function OrganizerFieldStatusListPane({
  rows,
  sequenceStart = 0,
  selectedApplicationId,
  onSelect,
  className,
}: {
  rows: FieldStatusRowDTO[];
  sequenceStart?: number;
  selectedApplicationId: string | null;
  onSelect: (applicationId: string) => void;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm">
        표시할 선수가 없습니다.
      </p>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      role="listbox"
      aria-label="현장 계체 선수 목록"
    >
      {rows.map((row, index) => {
        const selected = row.applicationId === selectedApplicationId;
        const sequence = displaySequenceNumber(index, sequenceStart);
        const tone = getFieldStatusListTone(row);
        const weighLabel = getFieldWeighInBadgeLabel(row.weighInStatus);
        const progressLabel = getFieldProgressBadgeLabel(row);
        return (
          <button
            key={row.applicationId}
            type="button"
            role="option"
            aria-selected={selected}
            aria-current={selected ? "true" : undefined}
            onClick={() => onSelect(row.applicationId)}
            className={getFieldStatusListCardClass({ selected, tone })}
          >
            <div className="flex flex-wrap items-start justify-between gap-1.5">
              <p className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate text-sm font-semibold leading-tight text-matchon-text-primary">
                <ListSequenceMobilePrefix sequence={sequence} />
                <span className="truncate">{row.fighterName}</span>
              </p>
              <ListStatusChip
                label={weighLabel}
                tone={weighTone(row.weighInStatus)}
              />
            </div>
            <p className="text-matchon-text-secondary truncate text-[12px] leading-tight">
              {row.gymName}
            </p>
            {row.division ? (
              <DivisionCompactDisplay
                division={row.division}
                fallbackLabel={row.divisionLabel}
                mainClassName="text-[12px] leading-tight"
                secondaryClassName="text-[11px] leading-tight"
              />
            ) : (
              <p className="text-matchon-text-secondary truncate text-[12px] leading-tight">
                {row.divisionLabel}
              </p>
            )}
            {progressLabel ? (
              <div className="pt-0.5">
                <ListStatusChip
                  label={progressLabel}
                  tone={progressTone(progressLabel)}
                  className="h-5 px-2 text-[10px]"
                />
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
