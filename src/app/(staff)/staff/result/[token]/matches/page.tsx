import { OrganizerMatchesBoard } from "@/components/domain/brackets/OrganizerMatchesBoard";
import { StaffRecorderUnlockGate } from "@/components/domain/events/StaffRecorderUnlockGate";
import { eventStaffAccessService } from "@/lib/services/event-staff-access.service";
import { matchService } from "@/lib/services/match.service";
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
  const eventTitle = matches[0]?.eventTitle ?? link.eventTitle;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          경기 운영 · {eventTitle}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
          이 화면은 결과 입력 링크로만 열렸습니다. 변경 사항은 대회 주최자 권한과
          동일하게 반영되며, 부여된 권한 범위를 넘는 버튼은 비활성화됩니다.
        </p>
      </div>

      <OrganizerMatchesBoard
        matches={matches}
        staffAccess={{
          token: link.token,
          canChangeMatchStatus: link.canChangeMatchStatus,
          canRecordOutcomeDraft: link.canRecordOutcomeDraft,
          canConfirmResult: link.canConfirmResult,
        }}
      />
    </div>
  );
}
