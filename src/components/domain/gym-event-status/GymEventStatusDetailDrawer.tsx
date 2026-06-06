"use client";

import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { OrganizerCustomFormAnswersSection } from "@/components/domain/applications/OrganizerCustomFormAnswersSection";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge";
import { DrawerPanel } from "@/components/ui/drawer-panel";
import { buttonVariants } from "@/components/ui/button";
import type { GymEventApplicationStatusRowDTO } from "@/lib/services/gym-event-status.service";
import { cn } from "@/lib/utils";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 text-sm">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function GymEventStatusDetailDrawer({
  row,
  publicSlug,
  open,
  onOpenChange,
}: {
  row: GymEventApplicationStatusRowDTO | null;
  publicSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  return (
    <DrawerPanel
      open={open}
      onOpenChange={onOpenChange}
      title={row.fighterName}
      description={row.divisionLabel}
    >
      <div className="flex flex-col gap-5">
        <dl className="grid gap-4">
          <DetailRow label="신청 상태">
            <ApplicationStatusBadge status={row.applicationStatus} />
          </DetailRow>
          <DetailRow label="입금 상태">
            <PaymentStatusBadge status={row.paymentStatus} />
          </DetailRow>
          <DetailRow label="신청서 상태">
            <span className="text-sm">{row.applicationFormStatusLabel}</span>
          </DetailRow>
          <DetailRow label="현장 확인">
            <CheckInStatusBadge status={row.checkInStatus} />
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
          <DetailRow label="대진">
            {row.bracketGenerated ? (
              <span className="text-sm">
                {row.bracketAssigned ? "배정됨" : "미배정"}
                {row.matchSummary ? ` · ${row.matchSummary}` : ""}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">대진 미생성</span>
            )}
          </DetailRow>
          {row.opponentName ? (
            <DetailRow label="상대 선수">
              <span className="text-sm">
                {row.opponentName}
                {row.opponentGymName ? ` (${row.opponentGymName})` : ""}
              </span>
            </DetailRow>
          ) : null}
          {row.matchNumber != null || row.globalMatchOrder != null ? (
            <DetailRow label="경기 순서">
              <span className="text-sm">
                {row.matchNumber != null ? `#${row.matchNumber}` : ""}
                {row.globalMatchOrder != null
                  ? ` · 전역 ${row.globalMatchOrder}`
                  : ""}
                {row.matchStatusLabel ? ` · ${row.matchStatusLabel}` : ""}
              </span>
            </DetailRow>
          ) : null}
          <DetailRow label="결과">
            <span className="text-sm">{row.resultSummary ?? "—"}</span>
          </DetailRow>
          {row.memo ? (
            <DetailRow label="신청 메모">
              <p className="whitespace-pre-wrap text-sm">{row.memo}</p>
            </DetailRow>
          ) : null}
        </dl>

        {row.customFormSnapshot ? (
          <OrganizerCustomFormAnswersSection snapshot={row.customFormSnapshot} />
        ) : null}

        {row.bracketGenerated ? (
          <Link
            href={`/events/${publicSlug}/brackets`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            공개 대진표 보기
          </Link>
        ) : null}
      </div>
    </DrawerPanel>
  );
}
