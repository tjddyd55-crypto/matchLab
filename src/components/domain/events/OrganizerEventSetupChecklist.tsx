"use client";

import { OrganizerEventSetupStepCard } from "@/components/domain/events/OrganizerEventSetupStepCard";
import type { EventSetupChecklist } from "@/lib/organizer-event-setup";

export function OrganizerEventSetupChecklist({
  checklist,
}: {
  checklist: EventSetupChecklist;
}) {
  return (
    <section
      id="setup-checklist"
      className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">대회 준비 체크리스트</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            아래 순서대로 준비하면 처음 주최하시는 분도 빠짐없이 대회를 열 수
            있습니다. 필수 항목이 비어 있어도 저장은 가능하며, 공개 전에
            안내를 참고해 주세요.
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold tabular-nums">
            준비율 {checklist.completionRate}%
          </p>
          <p className="text-muted-foreground text-xs">
            필수 {checklist.requiredDone}/{checklist.requiredTotal} 완료
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {checklist.steps.map((step) => (
          <OrganizerEventSetupStepCard key={step.id} step={step} />
        ))}
      </div>
    </section>
  );
}
