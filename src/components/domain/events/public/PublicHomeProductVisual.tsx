/**
 * Landing product mocks — 체육관 회원관리 + 대진표 (demo content).
 */
import type { ReactNode } from "react";

export function PublicHomeProductVisual() {
  return (
    <div className="relative min-w-0" aria-hidden>
      <div className="relative z-10 lg:pr-6">
        <GymMembersMock />
      </div>
      <div className="relative z-20 -mt-6 ml-4 sm:ml-8 lg:absolute lg:right-0 lg:bottom-0 lg:mt-0 lg:ml-0 lg:w-[88%]">
        <BracketMatchesMock />
      </div>
    </div>
  );
}

function FrameShell({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-matchon-border bg-white shadow-[0_18px_50px_-28px_rgba(0,28,122,0.35)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-matchon-border bg-matchon-surface px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-[#F87171]" />
        <span className="size-2.5 rounded-full bg-[#FBBF24]" />
        <span className="size-2.5 rounded-full bg-[#34D399]" />
        <span className="ml-2 truncate text-[11px] font-semibold text-matchon-text-secondary">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function GymMembersMock() {
  const rows = [
    { name: "강로원", type: "선수", plan: "월 이용권", status: "활성" },
    { name: "한현준", type: "선수", plan: "분기 이용권", status: "활성" },
    { name: "이수아", type: "일반", plan: "월 이용권", status: "활성" },
  ] as const;

  return (
    <FrameShell title="MATCHON · 체육관 회원">
      <div className="space-y-2.5 bg-matchon-surface p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-extrabold text-matchon-text-primary">
            회원 · 선수 관리
          </p>
          <span className="rounded-md bg-matchon-primary-light px-2 py-0.5 text-[10px] font-bold text-matchon-primary">
            소속 체육관
          </span>
        </div>
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between gap-3 rounded-xl border border-matchon-border bg-white px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-extrabold text-matchon-text-primary">
                {row.name}
              </p>
              <p className="truncate text-[11px] text-matchon-text-secondary">
                {row.type} · {row.plan}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </FrameShell>
  );
}

function BracketMatchesMock() {
  return (
    <FrameShell title="MATCHON · 전체 경기 편집">
      <div className="space-y-2 bg-matchon-surface p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-extrabold text-matchon-text-primary">
            대진표 관리
          </p>
          <span className="rounded-md bg-matchon-primary-light px-2 py-0.5 text-[10px] font-bold text-matchon-primary">
            중등부 · 남성
          </span>
        </div>
        {[
          {
            no: "1경기",
            kg: "68kg",
            red: { gym: "T-MAC", name: "강로원" },
            blue: { gym: "산본더원", name: "한현준" },
          },
          {
            no: "2경기",
            kg: "71kg",
            red: { gym: "산본더원", name: "김도윤" },
            blue: { gym: "T-MAC", name: "이준서" },
          },
        ].map((match) => (
          <article
            key={match.no}
            className="grid grid-cols-[48px_1fr_24px_1fr] items-stretch overflow-hidden rounded-xl border border-matchon-border bg-white"
          >
            <div className="flex flex-col items-center justify-center gap-0.5 border-r border-matchon-border bg-matchon-primary-light/40 px-1 py-1.5 text-center">
              <span className="text-[10px] font-extrabold text-matchon-text-primary">
                {match.no}
              </span>
              <span className="text-[9px] font-semibold text-matchon-text-secondary">
                {match.kg}
              </span>
            </div>
            <Corner tone="red" gym={match.red.gym} name={match.red.name} />
            <div className="flex items-center justify-center text-[10px] font-black text-matchon-text-secondary">
              VS
            </div>
            <Corner tone="blue" gym={match.blue.gym} name={match.blue.name} />
          </article>
        ))}
      </div>
    </FrameShell>
  );
}

function Corner({
  tone,
  gym,
  name,
}: {
  tone: "red" | "blue";
  gym: string;
  name: string;
}) {
  const isRed = tone === "red";
  return (
    <div
      className={
        isRed
          ? "border-r border-matchon-border bg-[#FEF2F2] px-2 py-1.5"
          : "bg-[#EFF6FF] px-2 py-1.5"
      }
    >
      <p
        className={
          isRed
            ? "text-[9px] font-bold tracking-wide text-[#DC2626]"
            : "text-[9px] font-bold tracking-wide text-[#2563EB]"
        }
      >
        {isRed ? "RED" : "BLUE"}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-matchon-text-secondary">
        {gym}
      </p>
      <p className="truncate text-[12px] font-extrabold text-matchon-text-primary">
        {name}
      </p>
    </div>
  );
}
