import { CourtJudgeUnavailableState } from "@/components/domain/judges/CourtJudgeUnavailableState";
import { CourtScoreJudgeScreen } from "@/components/domain/judges/CourtScoreJudgeScreen";
import { JudgeQrEntryError } from "@/components/domain/judges/JudgeQrEntryError";
import { resolveCourtJudgeEntryAccess } from "@/lib/court-judge-entry-access";
import { loadScoringPage } from "@/lib/services/judge-court.service";

type Props = {
  params: Promise<{ courtId: string }>;
  searchParams: Promise<{
    eventId?: string;
    token?: string;
    target?: string;
  }>;
};

export default async function CourtScoreJudgePage({ params, searchParams }: Props) {
  const { courtId } = await params;
  const sp = await searchParams;
  const access = await resolveCourtJudgeEntryAccess({
    courtId,
    expectedTarget: "score",
    searchParams: {
      eventId: sp.eventId,
      token: sp.token,
      target: sp.target,
    },
  });
  if (!access.ok) {
    return <JudgeQrEntryError reason={access.reason} qrType="court" />;
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

  const { court, matches, ongoingMatchId, scene, scoreSummariesByMatchId } = load;

  return (
    <CourtScoreJudgeScreen
      court={court}
      matches={matches}
      ongoingMatchId={ongoingMatchId}
      scene={scene}
      scoreSummariesByMatchId={scoreSummariesByMatchId}
    />
  );
}
