import { CourtJudgeIdentityGate } from "@/components/domain/judges/CourtJudgeIdentityGate";
import { CourtJudgeUnavailableState } from "@/components/domain/judges/CourtJudgeUnavailableState";
import { CourtHeadJudgePanel } from "@/components/domain/judges/CourtHeadJudgePanel";
import { loadHeadPage } from "@/lib/services/judge-court.service";

type Props = {
  params: Promise<{ courtId: string }>;
};

export default async function CourtHeadJudgePage({ params }: Props) {
  const { courtId } = await params;
  const load = await loadHeadPage(courtId);

  if (load.kind === "invalid_court") {
    return (
      <CourtJudgeUnavailableState variant="invalid_court" roleLabel="주심판" />
    );
  }

  if (load.kind === "inactive_court") {
    return (
      <CourtJudgeUnavailableState
        variant="inactive_court"
        roleLabel="주심판"
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
    scorecardsByMatchId,
    scoreSummariesByMatchId,
  } = load;

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
