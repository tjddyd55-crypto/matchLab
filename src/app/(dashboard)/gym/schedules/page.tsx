import { Suspense } from "react";
import { SchedulePageInner } from "./schedule-page-inner";

export const dynamic = "force-dynamic";

export default function GymSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="p-6 text-sm">일정 불러오는 중…</div>}>
      <SchedulePageInner searchParams={searchParams} myOnly={false} />
    </Suspense>
  );
}
