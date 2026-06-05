"use client";

import type { ReactNode } from "react";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import {
  FieldMemoForm,
  FieldStatusRowActions,
  WeighInWeightForm,
} from "@/components/domain/field-status/FieldStatusApplicationActions";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { DrawerPanel } from "@/components/ui/drawer-panel";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-0.5 text-sm">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function OrganizerFieldStatusDetailDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: FieldStatusRowDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  return (
    <DrawerPanel
      open={open}
      onOpenChange={onOpenChange}
      title={row.fighterName}
      description={`${row.gymName} · 현장 확인·계체`}
    >
      <div className="flex flex-col gap-5">
        <dl className="grid gap-4">
          <DetailRow label="체육관">{row.gymName}</DetailRow>
          <DetailRow label="신청 부문/체급">{row.divisionLabel}</DetailRow>
          <DetailRow label="신청 체급">
            {row.weightClassLabel ?? "—"}
          </DetailRow>
          <DetailRow label="현장 확인">
            <CheckInStatusBadge status={row.checkInStatus} />
          </DetailRow>
          <DetailRow label="계체 몸무게">
            {row.weighInWeightKg != null
              ? `${row.weighInWeightKg} kg`
              : "—"}
          </DetailRow>
          <DetailRow label="계체 결과">
            <WeighInStatusBadge status={row.weighInStatus} />
          </DetailRow>
          <DetailRow label="출전 확정">
            <EligibilityBadge
              label={row.eligibilityLabel}
              isEligible={row.isEligibleForBracket}
              title={row.eligibilityReason}
            />
          </DetailRow>
          {row.fieldMemo ? (
            <DetailRow label="현장 메모">
              <p className="whitespace-pre-wrap text-sm">{row.fieldMemo}</p>
            </DetailRow>
          ) : null}
        </dl>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">계체·메모</p>
          <WeighInWeightForm row={row} />
          <FieldMemoForm row={row} />
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">조치</p>
          <FieldStatusRowActions row={row} />
        </div>
      </div>
    </DrawerPanel>
  );
}
