"use client";

import type { CourtJudgeScene } from "@/lib/court-judge-page-state";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import type { FeedbackTone } from "@/components/shared/FeedbackMessage";

type BannerConfig = {
  title: string;
  lines: string[];
  badge: string;
  tone: FeedbackTone;
  status: MatchonStatus;
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
        tone: "info",
        status: "waiting",
      };
    case "no_ongoing_match":
      if (role === "score") {
        return {
          title: "현재 채점할 경기가 없습니다.",
          lines: ["주심판이 경기를 시작하면 채점할 수 있습니다."],
          badge: "대기",
          tone: "info",
          status: "waiting",
        };
      }
      return {
        title: "현재 진행중인 경기가 없습니다.",
        lines: ["준비 중인 경기 목록에서 경기 시작을 눌러 진행하세요."],
        badge: "대기",
        tone: "info",
        status: "waiting",
      };
    case "all_finished":
      return {
        title: "이 경기장의 모든 경기가 종료되었습니다.",
        lines: ["아래 목록에서 종료·취소 경기를 확인할 수 있습니다."],
        badge: "경기종료",
        tone: "success",
        status: "completed",
      };
    case "no_waiting_match":
      if (role === "head") {
        return {
          title: "진행할 경기가 없습니다.",
          lines: [
            "대기 중인 경기가 없습니다. 종료·취소된 경기만 남아 있을 수 있습니다.",
          ],
          badge: "대기",
          tone: "info",
          status: "waiting",
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
    <div className="space-y-2">
      <MatchonStatusBadge status={config.status} label={config.badge} size="sm" />
      <MatchonEmptyState
        title={config.title}
        description={config.lines.join(" ")}
        tone={config.tone}
      />
    </div>
  );
}

export function CourtJudgeScoreNotRequiredNotice() {
  return (
    <MatchonEmptyState
      title="이 경기는 채점심판 입력이 필요하지 않습니다."
      description="주심판 또는 운영자 판정으로 진행됩니다."
      tone="warning"
    />
  );
}
