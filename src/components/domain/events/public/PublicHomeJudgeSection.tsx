import Link from "next/link";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

const judgeCards = [
  {
    emoji: "📋",
    title: "채점심판",
    description: ["라운드별 RED/BLUE 점수 입력", "/judge/courts/[id]/score"],
    href: "/judge/login",
    accent: true,
  },
  {
    emoji: "⚖️",
    title: "주심판",
    description: ["경기 시작·승패 확정·채점 확인", "/judge/courts/[id]/head"],
    href: "/judge/login",
    accent: false,
  },
] as const;

export function PublicHomeJudgeSection() {
  return (
    <section className="bg-matchon-sidebar py-12 md:py-14">
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between",
        )}
      >
        <div className="max-w-md space-y-2.5">
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-white/45">
            Judge Access
          </p>
          <h2 className="font-black text-[22px] tracking-tight text-white">
            심판 전용 입장
          </h2>
          <p className="text-sm leading-relaxed text-white/50">
            채점심판과 주심판은 각자의 경기장 URL로 접속합니다. 운영자에게 받은
            링크를 사용하거나 아래에서 직접 입장하세요.
          </p>
        </div>

        <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
          {judgeCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={cn(
                "flex min-w-[200px] flex-col rounded-[20px] border px-6 py-5 transition-colors",
                card.accent
                  ? "border-matchon-primary/50 bg-matchon-primary/30 hover:bg-matchon-primary/40"
                  : "border-white/12 bg-white/6 hover:bg-white/10",
              )}
            >
              <span className="text-xl">{card.emoji}</span>
              <p className="mt-2.5 text-[15px] font-extrabold text-white">
                {card.title}
              </p>
              <div className="mt-1 text-xs font-semibold leading-relaxed text-white/55">
                {card.description.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p
                className={cn(
                  "mt-3.5 text-xs font-bold",
                  card.accent ? "text-matchon-primary-light" : "text-white/50",
                )}
              >
                입장하기 →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
