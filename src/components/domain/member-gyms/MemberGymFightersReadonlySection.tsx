import Link from "next/link";
import { format } from "date-fns";

type FighterRow = {
  id: string;
  name: string;
  gender: string;
  birthDate: Date;
  weight: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export function MemberGymFightersReadonlySection({
  memberGymId,
  fighters,
}: {
  memberGymId: string;
  fighters: FighterRow[];
}) {
  const active = fighters.filter((f) => f.status === "active").length;
  const inactive = fighters.length - active;
  const recent = fighters.slice(0, 5);

  return (
    <section className="space-y-3 rounded-md border border-matchon-border bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">소속 선수</h2>
        <p className="text-xs text-matchon-text-secondary">읽기 전용</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span>전체 {fighters.length}</span>
        <span>활동 {active}</span>
        <span>비활동 {inactive}</span>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-matchon-surface text-xs text-matchon-text-secondary">
            <tr>
              <th className="px-2 py-1.5">이름</th>
              <th className="px-2 py-1.5">성별</th>
              <th className="px-2 py-1.5">생년월일</th>
              <th className="px-2 py-1.5">체중</th>
              <th className="px-2 py-1.5">상태</th>
              <th className="px-2 py-1.5">등록일</th>
              <th className="px-2 py-1.5">상세</th>
            </tr>
          </thead>
          <tbody>
            {fighters.map((f) => (
              <tr key={f.id} className="border-t border-matchon-border">
                <td className="px-2 py-1.5 font-medium">{f.name}</td>
                <td className="px-2 py-1.5">{f.gender}</td>
                <td className="px-2 py-1.5">
                  {format(f.birthDate, "yyyy-MM-dd")}
                </td>
                <td className="px-2 py-1.5">{f.weight ?? "-"}</td>
                <td className="px-2 py-1.5">{f.status}</td>
                <td className="px-2 py-1.5">
                  {format(f.createdAt, "yyyy-MM-dd")}
                </td>
                <td className="px-2 py-1.5">
                  <Link
                    href={`/organizer/member-gyms/${memberGymId}/fighters/${f.id}`}
                    className="text-matchon-primary underline"
                  >
                    보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {recent.length > 0 ? (
        <p className="text-xs text-matchon-text-secondary md:hidden">
          최근 등록 {recent.length}명
        </p>
      ) : null}
      <ul className="space-y-2 md:hidden">
        {fighters.map((f) => (
          <li key={f.id} className="rounded border border-matchon-border p-3">
            <Link
              href={`/organizer/member-gyms/${memberGymId}/fighters/${f.id}`}
              className="block"
            >
              <p className="font-semibold">{f.name}</p>
              <p className="mt-1 text-xs text-matchon-text-secondary">
                {f.gender} · {f.status} · {format(f.birthDate, "yyyy-MM-dd")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {fighters.length === 0 ? (
        <p className="text-xs text-matchon-text-secondary">소속 선수가 없습니다.</p>
      ) : null}
    </section>
  );
}
