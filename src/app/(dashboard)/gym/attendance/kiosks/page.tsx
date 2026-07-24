import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { gymAttendanceService } from "@/lib/services/gym-attendance.service";
import { GymAttendanceKioskManager } from "@/components/domain/gym-attendance/GymAttendanceKioskManager";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymAttendanceKiosksPage() {
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

  const kiosks = await gymAttendanceService.listKiosks(actor);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <Link
            href="/gym/attendance"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 출석 현황
          </Link>
          <h1 className={matchonPageTitleClass}>출석 키오스크</h1>
          <p className={matchonPageDescClass}>
            입구용 출석 화면 링크를 만들고 QR로 열 수 있습니다. 회원은
            휴대폰 번호로 출석합니다.
          </p>
        </div>
        <GymAttendanceKioskManager initialKiosks={kiosks} />
      </div>
    </div>
  );
}
