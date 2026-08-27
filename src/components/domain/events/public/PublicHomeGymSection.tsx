import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

/** 실제 gym 포털 구현 기준으로만 노출 */
const gymCapabilities = [
  "회원 등록 및 관리",
  "선수 정보 관리",
  "소속 체육관 · 협회 연결",
  "회원 상태 확인",
  "이용권 관리",
] as const;

export function PublicHomeGymSection() {
  return (
    <section
      id="gym"
      aria-labelledby="home-gym-title"
      className="border-y border-matchon-border bg-matchon-surface py-14 md:py-20"
    >
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
        )}
      >
        <div className="min-w-0 space-y-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
            Gym Management
          </p>
          <h2
            id="home-gym-title"
            className="font-black text-[28px] tracking-tight text-matchon-text-primary md:text-[32px]"
          >
            체육관 운영도 MATCHON에서
          </h2>
          <p className="max-w-xl text-[15px] leading-relaxed text-matchon-text-secondary md:text-base">
            회원과 선수를 따로 관리할 필요 없이, 체육관 회원정보와 대회 참가
            선수를 연결해 관리하세요. 체육관에서 관리하던 선수를 그대로 대회
            참가와 운영으로 이어갈 수 있습니다.
          </p>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {gymCapabilities.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-matchon-border bg-white px-4 py-3 text-[14px] font-semibold text-matchon-text-primary"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
