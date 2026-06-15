import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerHomePage() {
  await requireActor();

  return (
    <>
      <OrganizerDashboardPageHeader
        title="주최자 홈"
        description="대회를 만들고 공개한 뒤 신청·대진표·경기·결과 순으로 운영합니다."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">내 대회</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            목록에서 상태·신청 인원을 확인하고 상세에서 수정합니다.
          </p>
          <Link
            href="/organizer/events"
            className={cn(buttonVariants({ className: "mt-4" }))}
          >
            대회 목록
          </Link>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">새 대회</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            생성 후 draft 상태이며, 경기구분·입금 설정 후 공개할 수 있습니다.
          </p>
          <Link
            href="/organizer/events/new"
            className={cn(buttonVariants({ variant: "outline", className: "mt-4" }))}
          >
            대회 만들기
          </Link>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold">바로가기</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          <li>
            <Link href="/notifications" className="text-primary underline-offset-4 hover:underline">
              알림
            </Link>
          </li>
          <li>
            <Link href="/events" className="text-primary underline-offset-4 hover:underline">
              공개 대회 목록
            </Link>
          </li>
          <li>
            <Link
              href="/events/sample-open-2026"
              className="text-primary underline-offset-4 hover:underline"
            >
              시연용 샘플 대회 공고 (시드 기준 슬러그)
            </Link>
          </li>
        </ul>
      </Card>
    </>
  );
}
