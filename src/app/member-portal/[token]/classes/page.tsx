import { MemberPortalAppShell } from "@/components/domain/gym-member-portal/MemberPortalAppShell";
import { MemberPortalClassCard } from "@/components/domain/gym-member-portal/MemberPortalClassCard";
import { requireMemberPortalPageSession } from "@/lib/gym-member-portal/require-member-session";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";

export const dynamic = "force-dynamic";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
  return `${WEEKDAY_KO[dt.getUTCDay()]}요일`;
}

export default async function MemberPortalClassesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await requireMemberPortalPageSession(token);
  const [classes, myParts] = await Promise.all([
    gymMemberPortalService.listGroupClasses(session),
    gymMemberPortalService.listMyParticipations(session),
  ]);

  const byDay = new Map<string, typeof classes>();
  for (const cls of classes) {
    const list = byDay.get(cls.dateKey) ?? [];
    list.push(cls);
    byDay.set(cls.dateKey, list);
  }

  const dayKeys = Array.from(byDay.keys()).sort();
  const activeParts = myParts.filter(
    (p) => p.bucket === "attending" || p.bucket === "waitlisted",
  );

  return (
    <MemberPortalAppShell token={token} gymName={session.gymName}>
      <h2 className="text-lg font-bold text-[#001C7A]">이번 주 프로그램</h2>
      <p className="mt-1 text-sm text-[#64748B]">그룹수업</p>

      <div className="mt-4 space-y-6">
        {dayKeys.length === 0 ? (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
            이번 주 표시할 그룹수업이 없습니다.
          </p>
        ) : (
          dayKeys.map((dateKey) => (
            <section key={dateKey} className="space-y-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                {weekdayLabel(dateKey)} · {dateKey}
              </h3>
              {(byDay.get(dateKey) ?? []).map((item) => (
                <MemberPortalClassCard key={item.id} token={token} item={item} />
              ))}
            </section>
          ))
        )}
      </div>

      <section className="mt-8 space-y-3">
        <h3 className="text-sm font-semibold text-[#001C7A]">내 신청</h3>
        {activeParts.length === 0 ? (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
            진행 중인 신청이 없습니다.
          </p>
        ) : (
          activeParts.map((p) => (
            <article
              key={`${p.classId}-${p.status}`}
              className="rounded-xl border border-[#E2E8F0] bg-white p-4"
            >
              <p className="text-xs text-[#64748B]">
                {p.dateKey} · {p.timeRangeLabel}
              </p>
              <p className="mt-1 font-semibold text-[#0F172A] break-keep">
                {p.title}
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                {p.instructorName ? `${p.instructorName} 선생님` : ""}
                {p.location ? ` · ${p.location}` : ""}
              </p>
              <p className="mt-1 text-sm font-medium text-[#001C7A]">
                {p.status === "attending"
                  ? "참석 예정"
                  : p.waitlistOrder != null
                    ? `대기 ${p.waitlistOrder}번째`
                    : "대기 중"}
              </p>
            </article>
          ))
        )}
      </section>
    </MemberPortalAppShell>
  );
}
