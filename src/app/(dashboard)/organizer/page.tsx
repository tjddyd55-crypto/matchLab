import Link from "next/link";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { ORGANIZER_COMPACT_ACTION_BAR_CLASS } from "@/lib/organizer-dashboard-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/organizer/events", label: "내 대회", hint: "상태·신청 인원 확인" },
  { href: "/organizer/events/new", label: "새 대회", hint: "draft 후 공개" },
  { href: "/notifications", label: "알림", hint: "운영 알림" },
  { href: "/events", label: "공개 목록", hint: "참가자용 공고" },
] as const;

export default async function OrganizerHomePage() {
  await requireActor();

  return (
    <>
      <OrganizerDashboardPageHeader
        eyebrow="Organizer"
        title="주최자 홈"
        description="대회를 만들고 공개한 뒤 신청·대진표·경기·결과 순으로 운영합니다."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href} className="block">
            <MatchonStatCardButton
              label={action.label}
              value="바로가기"
              hint={action.hint}
              className="h-full hover:border-matchon-primary/40"
            />
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-matchon-border bg-white p-4 shadow-sm">
          <h2 className="font-heading text-base font-bold text-matchon-text-primary">
            내 대회
          </h2>
          <p className="text-matchon-text-secondary mt-2 text-sm">
            목록에서 상태·신청 인원을 확인하고 상세에서 수정합니다.
          </p>
          <Link
            href="/organizer/events"
            className={cn(buttonVariants({ className: "mt-4 h-10" }))}
          >
            대회 목록
          </Link>
        </div>
        <div className="rounded-xl border border-matchon-border bg-white p-4 shadow-sm">
          <h2 className="font-heading text-base font-bold text-matchon-text-primary">
            새 대회
          </h2>
          <p className="text-matchon-text-secondary mt-2 text-sm">
            생성 후 draft 상태이며, 경기구분·입금 설정 후 공개할 수 있습니다.
          </p>
          <Link
            href="/organizer/events/new"
            className={cn(
              buttonVariants({ variant: "outline", className: "mt-4 h-10" }),
            )}
          >
            대회 만들기
          </Link>
        </div>
      </div>

      <div className={ORGANIZER_COMPACT_ACTION_BAR_CLASS}>
        <span className="text-matchon-text-secondary text-xs font-semibold uppercase tracking-wide">
          바로가기
        </span>
        <Link
          href="/events/sample-open-2026"
          className="text-matchon-primary text-sm font-medium hover:underline"
        >
          시연용 샘플 대회 공고
        </Link>
      </div>
    </>
  );
}
