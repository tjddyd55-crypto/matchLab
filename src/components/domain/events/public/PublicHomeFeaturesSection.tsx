import {
  ClipboardList,
  FileDown,
  Scale,
  Shuffle,
  Swords,
  Trophy,
} from "lucide-react";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: ClipboardList,
    title: "참가 신청 관리",
    description: "선수 정보와 참가 신청을 체계적으로 관리합니다.",
  },
  {
    icon: Scale,
    title: "계체 관리",
    description: "현장 계체 현황과 선수 상태를 빠르게 확인합니다.",
  },
  {
    icon: Shuffle,
    title: "대진 편성",
    description: "선수 정보를 비교하며 빠르게 대진을 구성합니다.",
  },
  {
    icon: Swords,
    title: "경기 운영",
    description: "경기장과 경기 순서를 현장에서 관리합니다.",
  },
  {
    icon: FileDown,
    title: "PDF / 출력",
    description: "대진표와 운영 자료를 바로 출력하고 공유합니다.",
  },
  {
    icon: Trophy,
    title: "결과 관리",
    description: "경기 결과까지 하나의 대회 안에서 관리합니다.",
  },
] as const;

export function PublicHomeFeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="home-features-title"
      className="bg-white py-14 md:py-20"
    >
      <div className={cn(PUBLIC_CONTENT_CONTAINER_CLASS, "space-y-10")}>
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
            Features
          </p>
          <h2
            id="home-features-title"
            className="mt-1.5 font-black text-[28px] tracking-tight text-matchon-text-primary md:text-[32px]"
          >
            대회 운영에 필요한 기능을 한곳에
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-matchon-border bg-matchon-surface/60 p-5 transition-colors hover:border-matchon-primary/30 hover:bg-white"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-matchon-primary-light text-matchon-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-[16px] font-extrabold text-matchon-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-matchon-text-secondary">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
