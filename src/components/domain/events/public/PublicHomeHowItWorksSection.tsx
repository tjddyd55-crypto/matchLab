import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

const steps = [
  {
    step: "STEP 01",
    title: "대회 공고 확인",
    description: "진행 중인 대회를 포스터와 함께 확인하고 일정을 파악하세요.",
    emoji: "📢",
  },
  {
    step: "STEP 02",
    title: "선수 신청",
    description: "체육관 계정으로 선수를 등록하고 대회에 신청합니다.",
    emoji: "🥊",
  },
  {
    step: "STEP 03",
    title: "대진표 확인",
    description: "대회 당일 대진표를 확인하고 경기 순서를 파악하세요.",
    emoji: "📋",
  },
  {
    step: "STEP 04",
    title: "경기 및 결과",
    description: "경기 진행 후 결과가 실시간으로 업데이트됩니다.",
    emoji: "🏆",
  },
] as const;

export function PublicHomeHowItWorksSection() {
  return (
    <section className="bg-white py-14 md:py-16">
      <div className={cn(PUBLIC_CONTENT_CONTAINER_CLASS, "space-y-10")}>
        <div className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
            How it works
          </p>
          <h2 className="mt-1.5 font-black text-[28px] tracking-tight text-matchon-text-primary">
            참가부터 결과 확인까지
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <span className="text-4xl">{item.emoji}</span>
              <p className="mt-3.5 text-[11px] font-extrabold tracking-[0.55px] text-matchon-primary">
                {item.step}
              </p>
              <h3 className="mt-1.5 text-[15px] font-bold text-matchon-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 max-w-[270px] text-[13px] leading-relaxed text-matchon-text-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
