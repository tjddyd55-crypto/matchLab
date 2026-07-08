import { CourtHeadJudgeScreen } from "@/components/domain/judges/CourtHeadJudgeScreen";
import { CourtJudgeUnavailableState } from "@/components/domain/judges/CourtJudgeUnavailableState";
import { JudgeQrEntryError } from "@/components/domain/judges/JudgeQrEntryError";
import { resolveCourtJudgeEntryAccess } from "@/lib/court-judge-entry-access";
import { loadHeadPage } from "@/lib/services/judge-court.service";

type Props = {
  params: Promise<{ courtId: string }>;
  searchParams: Promise<{
    eventId?: string;
    token?: string;
    target?: string;
  }>;
};

export default async function CourtHeadJudgePage({ params, searchParams }: Props) {
  const { courtId } = await params;
  const sp = await searchParams;
  const access = await resolveCourtJudgeEntryAccess({
    courtId,
    expectedTarget: "head",
    searchParams: {
      eventId: sp.eventId,
      token: sp.token,
      target: sp.target,
    },
  });
  if (!access.ok) {
    return <JudgeQrEntryError reason={access.reason} qrType="court" />;
  }

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
    <CourtHeadJudgeScreen
      court={court}
      matches={matches}
      ongoingMatchId={ongoingMatchId}
      scene={scene}
      scorecardsByMatchId={scorecardsByMatchId}
      scoreSummariesByMatchId={scoreSummariesByMatchId}
    />
  );
}
