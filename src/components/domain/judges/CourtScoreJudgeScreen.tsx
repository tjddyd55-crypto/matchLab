"use client";

import { EventFinishedReadOnlyBanner } from "@/components/domain/events/EventFinishedReadOnlyBanner";
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
  eventFinished = false,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scene: CourtJudgeScene;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
  eventFinished?: boolean;
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
        <div className="space-y-3">
          {eventFinished ? (
            <EventFinishedReadOnlyBanner
              message="대회가 종료되어 채점 입력이 마감되었습니다."
            />
          ) : null}
          <CourtScoreJudgePanel
            court={court}
            matches={matches}
            ongoingMatchId={ongoingMatchId}
            scoreSummariesByMatchId={scoreSummariesByMatchId}
            scene={scene}
            judgeName={session.judgeName}
            birthDate={session.birthDate}
            eventFinished={eventFinished}
          />
        </div>
      )}
    </CourtJudgeIdentityGate>
  );
}
