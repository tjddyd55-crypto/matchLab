import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { gymAttendanceService } from "@/lib/services/gym-attendance.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { GymAttendanceAdminPanel } from "@/components/domain/gym-attendance/GymAttendanceAdminPanel";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";
import { toSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";

export const dynamic = "force-dynamic";

export default async function GymAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const pick = (key: string) => {
    const v = sp[key];
    return typeof v === "string" ? v : undefined;
  };

  const today = toSeoulDateOnlyString();
  const filters = {
    dateFrom: pick("dateFrom") ?? today,
    dateTo: pick("dateTo") ?? today,
    memberNameQ: pick("memberNameQ"),
    phoneTail: pick("phoneTail"),
    source: pick("source"),
  };

  const [summary, list, membersResult] = await Promise.all([
    gymAttendanceService.getGymAttendanceSummary(actor),
    gymAttendanceService.listAttendances(actor, filters),
    gymMemberService.listMembers(actor, { page: 1, pageSize: 200 }),
  ]);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <h1 className={matchonPageTitleClass}>출석 관리</h1>
          <p className={matchonPageDescClass}>
            회원 출석 현황을 확인하고 필요한 경우 직접 출석을 등록할 수
            있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gym/attendance/kiosks"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            출석 키오스크
          </Link>
        </div>
        <GymAttendanceAdminPanel
          summary={summary}
          rows={list.rows}
          total={list.total}
          members={membersResult.items.map((m) => ({
            id: m.id,
            name: m.name,
            memberNumber: m.memberNumber,
          }))}
          filters={filters}
        />
      </div>
    </div>
  );
}
