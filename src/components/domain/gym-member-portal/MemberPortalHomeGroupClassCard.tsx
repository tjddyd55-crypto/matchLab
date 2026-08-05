import Link from "next/link";
import { toSeoulDateKey } from "@/lib/gym-schedule/seoul-schedule";

type SummaryItem = {
  id: string;
  title: string;
  dateKey: string;
  dateLabel: string;
  timeRangeLabel: string;
  startTimeLabel: string;
};

export function MemberPortalHomeGroupClassCard({
  token,
  weekClassCount,
  items,
}: {
  token: string;
  weekClassCount: number;
  items: SummaryItem[];
}) {
  const todayKey = toSeoulDateKey(new Date());
  const weekHref = `/member-portal/${token}/classes?view=week&date=${todayKey}`;
  const monthHref = `/member-portal/${token}/classes?view=month&date=${todayKey}`;

  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          이번 주 남은 그룹수업
        </h3>
        <Link
          href={weekHref}
          className="shrink-0 text-sm font-medium text-[#0A47FF]"
        >
          전체 보기 &gt;
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm text-[#64748B]">
            이번 주 예정된 그룹수업이 없습니다.
          </p>
          <Link
            href={monthHref}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[#E2E8F0] px-3 text-sm font-medium text-[#001C7A]"
          >
            월간 일정 보기
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/member-portal/${token}/classes?view=week&date=${item.dateKey}&classId=${item.id}`}
                className="block rounded-lg -mx-1 px-1 py-1 hover:bg-[#F8FAFC]"
              >
                <p className="text-xs text-[#64748B]">{item.dateLabel}</p>
                <p className="mt-0.5 text-sm text-[#0F172A]">
                  <span className="font-medium">{item.startTimeLabel}</span>
                  <span className="text-[#64748B]"> · </span>
                  <span className="font-semibold break-keep">{item.title}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-sm text-[#64748B]">
        {weekClassCount === 0
          ? "총 0개 수업"
          : `총 ${weekClassCount}개 수업`}
      </p>
    </section>
  );
}
