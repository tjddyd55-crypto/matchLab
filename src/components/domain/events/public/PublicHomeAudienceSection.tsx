import { Building2, Landmark, Trophy } from "lucide-react";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

const audiences = [
  {
    icon: Building2,
    title: "체육관",
    description: "회원과 선수를 관리하고 대회 참가까지 연결합니다.",
  },
  {
    icon: Trophy,
    title: "대회 주최자",
    description: "신청부터 대진, 경기 운영과 결과까지 관리합니다.",
  },
  {
    icon: Landmark,
    title: "협회 / 운영진",
    description: "소속 체육관과 대회 운영에 필요한 정보를 확인합니다.",
  },
] as const;

export function PublicHomeAudienceSection() {
  return (
    <section
      id="audience"
      aria-labelledby="home-audience-title"
      className="bg-white py-14 md:py-20"
    >
      <div className={cn(PUBLIC_CONTENT_CONTAINER_CLASS, "space-y-10")}>
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
            Who it&apos;s for
          </p>
          <h2
            id="home-audience-title"
            className="mt-1.5 font-black text-[28px] tracking-tight text-matchon-text-primary md:text-[32px]"
          >
            체육관부터 대회 주최자까지
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {audiences.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-matchon-border bg-matchon-surface/50 p-5"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-matchon-primary-light text-matchon-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-[16px] font-extrabold text-matchon-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-matchon-text-secondary">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
