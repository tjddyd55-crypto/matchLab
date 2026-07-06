"use client";

import { CourtJudgeIdentityGate } from "@/components/domain/judges/CourtJudgeIdentityGate";
import { CourtScoreJudgePanel } from "@/components/domain/judges/CourtScoreJudgePanel";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import type { CourtJudgeScene } from "@/lib/court-judge-page-state";

export function CourtScoreJudgeScreen({
  court,
  matches,
  ongoingMatchId,
  scene,
  scoreSummariesByMatchId,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scene: CourtJudgeScene;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
}) {
  return (
    <CourtJudgeIdentityGate
      courtId={court.courtId}
      role="score"
      roleLabel="채점심판"
      eventTitle={court.eventTitle}
      courtName={court.courtName}
    >
      {(session) => (
        <CourtScoreJudgePanel
          court={court}
          matches={matches}
          ongoingMatchId={ongoingMatchId}
          scoreSummariesByMatchId={scoreSummariesByMatchId}
          scene={scene}
          judgeName={session.judgeName}
          birthDate={session.birthDate}
        />
      )}
    </CourtJudgeIdentityGate>
  );
}
