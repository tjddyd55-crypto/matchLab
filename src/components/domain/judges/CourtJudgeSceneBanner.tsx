"use client";

import type { CourtJudgeScene } from "@/lib/court-judge-page-state";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import type { FeedbackTone } from "@/components/shared/FeedbackMessage";

type BannerConfig = {
  title: string;
  lines: string[];
  badge: string;
  tone: FeedbackTone;
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
      };
    case "no_ongoing_match":
      if (role === "score") {
        return {
          title: "현재 채점할 경기가 없습니다.",
          lines: ["주심판이 경기를 시작하면 채점할 수 있습니다."],
          badge: "대기",
          tone: "info",
        };
      }
      return {
        title: "현재 진행중인 경기가 없습니다.",
        lines: ["준비 중인 경기 목록에서 경기 시작을 눌러 진행하세요."],
        badge: "대기",
        tone: "info",
      };
    case "all_finished":
      return {
        title: "이 경기장의 모든 경기가 종료되었습니다.",
        lines: ["아래 목록에서 종료·취소 경기를 확인할 수 있습니다."],
        badge: "경기종료",
        tone: "success",
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
    <FeedbackMessage tone={config.tone}>
      <span className="font-semibold">{config.title}</span>
      {config.lines.map((line) => (
        <span key={line} className="mt-1 block text-sm font-normal opacity-90">
          {line}
        </span>
      ))}
    </FeedbackMessage>
  );
}

export function CourtJudgeScoreNotRequiredNotice() {
  return (
    <FeedbackMessage tone="warning">
      <span className="font-semibold">이 경기는 채점심판 입력이 필요하지 않습니다.</span>
      <span className="mt-1 block text-sm font-normal opacity-90">
        주심판 또는 운영자 판정으로 진행됩니다.
      </span>
    </FeedbackMessage>
  );
}
