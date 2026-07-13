import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

const stats = [
  { value: "240+", label: "개최 대회" },
  { value: "8,500+", label: "등록 선수" },
  { value: "42,000+", label: "경기 기록" },
  { value: "1,200+", label: "심판 채점" },
] as const;

export function PublicHomeStatsSection() {
  return (
    <section className="border-b border-matchon-border bg-white">
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "grid grid-cols-2 gap-0 py-0 md:grid-cols-4",
        )}
      >
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={cn(
              "flex flex-col items-center px-6 py-6 text-center",
              index < stats.length - 1 && "md:border-r md:border-matchon-border",
              index % 2 === 0 && "border-r border-matchon-border md:border-r",
            )}
          >
            <p className="font-black text-[26px] tracking-tight text-matchon-text-primary">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-matchon-text-secondary">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
