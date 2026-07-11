"use client";

import type { CourtJudgeScene } from "@/lib/court-judge-page-state";
import { cn } from "@/lib/utils";

type BannerConfig = {
  title: string;
  lines: string[];
  badge: string;
  className: string;
};

function bannerForScene(
  scene: CourtJudgeScene,
  role: "score" | "head",
): BannerConfig | null {
  switch (scene) {
    case "no_matches":
      return {
        title: "아직 배정된 경기가 없습니다.",
        lines: [
          "운영자가 대진표를 생성하면 이 화면에서 확인할 수 있습니다.",
        ],
        badge: "대기",
        className: "border-primary/25 bg-primary/5 text-foreground",
      };
    case "no_ongoing_match":
      if (role === "score") {
        return {
          title: "현재 채점할 경기가 없습니다.",
          lines: ["주심판이 경기를 시작하면 채점할 수 있습니다."],
          badge: "대기",
          className: "border-primary/25 bg-primary/5 text-foreground",
        };
      }
      return {
        title: "현재 진행중인 경기가 없습니다.",
        lines: ["준비 중인 경기 목록에서 경기 시작을 눌러 진행하세요."],
        badge: "대기",
        className: "border-primary/25 bg-primary/5 text-foreground",
      };
    case "all_finished":
      return {
        title: "이 경기장의 모든 경기가 종료되었습니다.",
        lines: ["아래 목록에서 종료·취소 경기를 확인할 수 있습니다."],
        badge: "경기종료",
        className: "border-emerald-500/20 bg-emerald-50/50 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100",
      };
    case "no_waiting_match":
      if (role === "head") {
        return {
          title: "진행할 경기가 없습니다.",
          lines: ["대기 중인 경기가 없습니다. 종료·취소된 경기만 남아 있을 수 있습니다."],
          badge: "대기",
          className: "border-muted-foreground/25 bg-muted/40 text-foreground",
        };
      }
      return null;
    default:
      return null;
  }
}

export function CourtJudgeSceneBanner({
  scene,
  role,
}: {
  scene: CourtJudgeScene;
  role: "score" | "head";
}) {
  const config = bannerForScene(scene, role);
  if (!config) return null;

  return (
    <section
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        config.className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-semibold">
          {config.badge}
        </span>
        <p className="font-semibold">{config.title}</p>
      </div>
      <div className="text-muted-foreground mt-2 space-y-1 text-xs leading-relaxed">
        {config.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

export function CourtJudgeScoreNotRequiredNotice() {
  return (
    <section className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      <p className="font-semibold">이 경기는 채점심판 입력이 필요하지 않습니다.</p>
      <p className="mt-1 text-xs opacity-90">
        주심판 또는 운영자 판정으로 진행됩니다.
      </p>
    </section>
  );
}
