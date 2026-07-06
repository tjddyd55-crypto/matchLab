"use client";

import { CourtHeadJudgePanel } from "@/components/domain/judges/CourtHeadJudgePanel";
import { CourtJudgeIdentityGate } from "@/components/domain/judges/CourtJudgeIdentityGate";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtJudgeScorecardVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import type { CourtJudgeScene } from "@/lib/court-judge-page-state";

export function CourtHeadJudgeScreen({
  court,
  matches,
  ongoingMatchId,
  scene,
  scorecardsByMatchId,
  scoreSummariesByMatchId,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scene: CourtJudgeScene;
  scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]>;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
}) {
  return (
    <CourtJudgeIdentityGate
      courtId={court.courtId}
      role="head"
      roleLabel="주심판"
      eventTitle={court.eventTitle}
      courtName={court.courtName}
    >
      {() => (
        <CourtHeadJudgePanel
          court={court}
          matches={matches}
          ongoingMatchId={ongoingMatchId}
          scorecardsByMatchId={scorecardsByMatchId}
          scoreSummariesByMatchId={scoreSummariesByMatchId}
          scene={scene}
        />
      )}
    </CourtJudgeIdentityGate>
  );
}
