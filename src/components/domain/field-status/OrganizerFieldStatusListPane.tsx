"use client";

import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { ListSequenceMobilePrefix } from "@/components/domain/shared/CompactApplicantFilterBar";
import {
  getFieldStatusListCardClass,
  getFieldStatusListTone,
} from "@/lib/field-status-list-display";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { displaySequenceNumber } from "@/lib/ui/list-sequence";
import { cn } from "@/lib/utils";

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
      aria-label="현장 확인 선수 목록"
    >
      {rows.map((row, index) => {
        const selected = row.applicationId === selectedApplicationId;
        const sequence = displaySequenceNumber(index, sequenceStart);
        const tone = getFieldStatusListTone(row);
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
                {/* 최대 2개: 현장 + 계체 (출전/중복 badge 제거) */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <CheckInStatusBadge status={row.checkInStatus} />
                  <WeighInStatusBadge status={row.weighInStatus} />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
