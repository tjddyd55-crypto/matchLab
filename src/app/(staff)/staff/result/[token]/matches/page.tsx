import { StaffResultEntryBoard } from "@/components/domain/staff/StaffResultEntryBoard";
import { StaffRecorderUnlockGate } from "@/components/domain/events/StaffRecorderUnlockGate";
import { eventStaffAccessService } from "@/lib/services/event-staff-access.service";
import { matchService } from "@/lib/services/match.service";
import { staffPermissionSummary } from "@/lib/staff-match-display";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StaffRecorderMatchesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const ctx = await eventStaffAccessService.resolveStaffRecorderPage(token);
  if (ctx.kind === "invalid") notFound();
  if (ctx.kind === "locked") {
    return (
      <StaffRecorderUnlockGate token={token} eventTitle={ctx.eventTitle} />
    );
  }

  const link = ctx.link;
  const matches = await matchService.listStaffEventMatches(link);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-10 md:px-6 md:py-8">
      <header className="space-y-2">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          스태프 결과 입력
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {link.eventTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {link.label} · 권한: {staffPermissionSummary(link)}
        </p>
        <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
          이 화면은 결과 입력 전용 링크입니다. 현장에서만 공유하고, 신청서·연락처
          등 민감정보는 표시되지 않습니다.
        </p>
      </header>

      <StaffResultEntryBoard
        matches={matches}
        staffAccess={{
          token: link.token,
          label: link.label,
          canRecordOutcomeDraft: link.canRecordOutcomeDraft,
          canConfirmResult: link.canConfirmResult,
          canChangeMatchStatus: link.canChangeMatchStatus,
        }}
      />
    </div>
  );
}
