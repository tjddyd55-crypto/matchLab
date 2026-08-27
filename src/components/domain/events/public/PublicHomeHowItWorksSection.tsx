import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

const steps = [
  {
    step: "01",
    title: "대회 생성",
    description: "대회 일정과 경기구분을 설정하고 운영 준비를 시작합니다.",
  },
  {
    step: "02",
    title: "참가 신청",
    description: "체육관·선수 신청을 받고 참가 정보를 정리합니다.",
  },
  {
    step: "03",
    title: "대진 편성",
    description: "선수 정보를 비교하며 대진과 경기 순서를 구성합니다.",
  },
  {
    step: "04",
    title: "경기 운영 및 결과",
    description: "현장 운영과 결과 기록까지 한 흐름으로 마무리합니다.",
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
            대회 준비부터 종료까지
          </h2>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <li
              key={item.step}
              className="relative rounded-2xl border border-matchon-border bg-white p-5"
            >
              <p className="text-[11px] font-extrabold tracking-[0.55px] text-matchon-primary">
                {item.step}
              </p>
              <h3 className="mt-2 text-[16px] font-extrabold text-matchon-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-matchon-text-secondary">
                {item.description}
              </p>
              {index < steps.length - 1 ? (
                <span className="pointer-events-none absolute top-1/2 -right-3 hidden h-px w-6 -translate-y-1/2 bg-matchon-border lg:block" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
