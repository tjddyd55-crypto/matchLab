import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

const steps = [
  {
    step: "01",
    title: "회원/선수 관리",
    description: "체육관에서 회원·선수·이용권을 등록하고 상태를 관리합니다.",
  },
  {
    step: "02",
    title: "대회 참가 신청",
    description: "관리 중인 선수로 대회 참가 신청을 진행합니다.",
  },
  {
    step: "03",
    title: "대진 편성",
    description: "체급과 선수 정보를 확인하며 대진을 구성합니다.",
  },
  {
    step: "04",
    title: "경기 운영",
    description: "경기장별 순서와 현장 운영을 관리합니다.",
  },
  {
    step: "05",
    title: "결과 관리",
    description: "경기 결과와 운영 자료를 이어서 정리합니다.",
  },
] as const;

export function PublicHomeHowItWorksSection() {
  return (
    <section
      aria-labelledby="home-workflow-title"
      className="border-y border-matchon-border bg-matchon-surface py-14 md:py-20"
    >
      <div className={cn(PUBLIC_CONTENT_CONTAINER_CLASS, "space-y-10")}>
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
            Workflow
          </p>
          <h2
            id="home-workflow-title"
            className="mt-1.5 font-black text-[28px] tracking-tight text-matchon-text-primary md:text-[32px]"
          >
            회원 관리부터 대회 종료까지
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-matchon-text-secondary">
            체육관 회원·선수 데이터가 참가 신청과 경기 운영으로 이어집니다.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((item) => (
            <li
              key={item.step}
              className="rounded-2xl border border-matchon-border bg-white p-5"
            >
              <p className="text-[11px] font-extrabold tracking-[0.55px] text-matchon-primary">
                {item.step}
              </p>
              <h3 className="mt-2 text-[15px] font-extrabold text-matchon-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-matchon-text-secondary">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
