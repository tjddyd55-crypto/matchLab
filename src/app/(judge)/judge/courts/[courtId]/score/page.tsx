import { CourtJudgeIdentityGate } from "@/components/domain/judges/CourtJudgeIdentityGate";
import { CourtJudgeUnavailableState } from "@/components/domain/judges/CourtJudgeUnavailableState";
import { CourtScoreJudgePanel } from "@/components/domain/judges/CourtScoreJudgePanel";
import { JudgeQrEntryError } from "@/components/domain/judges/JudgeQrEntryError";
import { assertCourtJudgeEntryAccess } from "@/lib/court-judge-entry-session";
import { loadScoringPage } from "@/lib/services/judge-court.service";

type Props = {
  params: Promise<{ courtId: string }>;
};

export default async function CourtScoreJudgePage({ params }: Props) {
  const { courtId } = await params;
  const access = await assertCourtJudgeEntryAccess(courtId, "score");
  if (!access.ok) {
    return <JudgeQrEntryError reason="missing_token" qrType="court" />;
  }

  const load = await loadScoringPage(courtId);

  if (load.kind === "invalid_court") {
    return (
      <CourtJudgeUnavailableState variant="invalid_court" roleLabel="채점심판" />
    );
  }

  if (load.kind === "inactive_court") {
    return (
      <CourtJudgeUnavailableState
        variant="inactive_court"
        roleLabel="채점심판"
        eventTitle={load.eventTitle}
        courtName={load.courtName}
      />
    );
  }

  const {
    court,
    matches,
    ongoingMatchId,
    scene,
    scoreSummariesByMatchId,
  } = load;

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
