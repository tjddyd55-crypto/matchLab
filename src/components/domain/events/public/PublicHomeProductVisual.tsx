/**
 * Landing product mock — 대진표 전체 경기 편집 느낌 (demo content).
 * 실제 screenshot asset 없이 제품 UI 톤만 전달.
 */
export function PublicHomeProductVisual() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-matchon-border bg-white shadow-[0_18px_50px_-28px_rgba(0,28,122,0.35)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-matchon-border bg-matchon-surface px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-[#F87171]" />
        <span className="size-2.5 rounded-full bg-[#FBBF24]" />
        <span className="size-2.5 rounded-full bg-[#34D399]" />
        <span className="ml-2 truncate text-[11px] font-semibold text-matchon-text-secondary">
          MATCHON · 전체 경기 편집
        </span>
      </div>

      <div className="space-y-2.5 bg-matchon-surface p-3 sm:p-4">
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
          {
            no: "3경기",
            kg: "60kg",
            red: { gym: "더원짐", name: "박서준" },
            blue: { gym: "T-MAC", name: "최민호" },
          },
        ].map((match) => (
          <article
            key={match.no}
            className="grid grid-cols-[52px_1fr_28px_1fr] items-stretch overflow-hidden rounded-xl border border-matchon-border bg-white"
          >
            <div className="flex flex-col items-center justify-center gap-0.5 border-r border-matchon-border bg-matchon-primary-light/40 px-1 py-2 text-center">
              <span className="text-[10px] font-extrabold text-matchon-text-primary">
                {match.no}
              </span>
              <span className="text-[9px] font-semibold text-matchon-text-secondary">
                {match.kg}
              </span>
            </div>
            <Corner
              tone="red"
              gym={match.red.gym}
              name={match.red.name}
            />
            <div className="flex items-center justify-center text-[10px] font-black text-matchon-text-secondary">
              VS
            </div>
            <Corner
              tone="blue"
              gym={match.blue.gym}
              name={match.blue.name}
            />
          </article>
        ))}
      </div>
    </div>
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
          ? "border-r border-matchon-border bg-[#FEF2F2] px-2.5 py-2"
          : "bg-[#EFF6FF] px-2.5 py-2"
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
