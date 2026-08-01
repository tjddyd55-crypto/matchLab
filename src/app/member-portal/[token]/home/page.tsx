import Link from "next/link";
import { MemberPortalAppShell } from "@/components/domain/gym-member-portal/MemberPortalAppShell";
import { requireMemberPortalPageSession } from "@/lib/gym-member-portal/require-member-session";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";

export const dynamic = "force-dynamic";

export default async function MemberPortalHomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await requireMemberPortalPageSession(token);
  const home = await gymMemberPortalService.getHome(session);

  return (
    <MemberPortalAppShell token={token} gymName={home.gymName}>
      <p className="text-sm text-[#64748B]">
        안녕하세요,{" "}
        <span className="font-semibold text-[#0F172A]">
          {home.memberName}
        </span>{" "}
        회원님
      </p>

      <section className="mt-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#001C7A]">오늘 일정</h2>
        {home.todayItems.length === 0 ? (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
            오늘 예정된 일정이 없습니다.
          </p>
        ) : (
          home.todayItems.map((item, idx) => (
            <article
              key={`${item.kind}-${item.startsAt.toISOString()}-${idx}`}
              className="rounded-xl border border-[#E2E8F0] bg-white p-4"
            >
              <p className="text-sm font-medium text-[#0F172A]">
                {item.timeRangeLabel}
              </p>
              <p className="mt-1 text-base font-semibold text-[#001C7A] break-keep">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                {item.subtitle} · {item.statusLabel}
              </p>
            </article>
          ))
        )}
      </section>

      <section className="mt-5 grid gap-3">
        <Link
          href={`/member-portal/${token}/schedule`}
          className="rounded-xl border border-[#E2E8F0] bg-white p-4"
        >
          <p className="text-sm font-semibold text-[#0F172A]">다음 PT 일정</p>
          {home.nextPt ? (
            <p className="mt-1 text-sm text-[#64748B]">
              {home.nextPt.dateKey} {home.nextPt.timeRangeLabel}
              <br />
              {home.nextPt.instructorName} 선생님
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#64748B]">예정된 PT가 없습니다.</p>
          )}
        </Link>
        <Link
          href={`/member-portal/${token}/classes`}
          className="rounded-xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#0A47FF]/40"
          data-testid="home-week-group-classes"
        >
          <p className="text-sm font-semibold text-[#0F172A]">이번 주 그룹수업</p>
          <p className="mt-1 text-sm text-[#64748B]">
            {home.weekClassCount}개 수업
          </p>
          <p className="mt-2 text-xs font-medium text-[#0A47FF]">달력에서 보기</p>
        </Link>
        <Link
          href={`/member-portal/${token}/classes`}
          className="rounded-xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#0A47FF]/40"
          data-testid="home-my-participations"
        >
          <p className="text-sm font-semibold text-[#0F172A]">내 참석 신청</p>
          <p className="mt-1 text-sm text-[#64748B]">
            진행 중 {home.myActiveParticipationCount}건
          </p>
          <p className="mt-2 text-xs font-medium text-[#0A47FF]">그룹수업으로 이동</p>
        </Link>
      </section>
    </MemberPortalAppShell>
  );
}
