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
import { displaySequenceNumber } from "@/lib/ui/list-sequence";
import { cn } from "@/lib/utils";

function ListStatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "ok" | "warn" | "danger" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
        tone === "ok" && "border-emerald-300 bg-emerald-50 text-emerald-800",
        tone === "warn" && "border-orange-300 bg-orange-50 text-orange-900",
        tone === "danger" && "border-rose-300 bg-rose-50 text-rose-900",
        tone === "accent" && "border-amber-300 bg-amber-50 text-amber-900",
        tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-600",
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
      className={cn("flex flex-col gap-2", className)}
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
            <div className="flex items-start gap-2">
              <ListSequenceMobilePrefix sequence={sequence} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-semibold text-matchon-text-primary">
                  {row.fighterName}
                </p>
                <p className="text-matchon-text-secondary truncate text-xs">
                  {row.gymName}
                </p>
                <DivisionCompactDisplay
                  division={row.division}
                  mainClassName="text-xs"
                  secondaryClassName="text-[11px]"
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <ListStatusChip
                    label={weighLabel}
                    tone={weighTone(row.weighInStatus)}
                  />
                  {progressLabel ? (
                    <ListStatusChip
                      label={progressLabel}
                      tone={progressTone(progressLabel)}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
