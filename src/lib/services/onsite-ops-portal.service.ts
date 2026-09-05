import "server-only";

import { fieldStatusService } from "@/lib/services/field-status.service";
import { matchService } from "@/lib/services/match.service";
import { judgeAssignmentRepository } from "@/lib/repositories/judge-assignment.repository";
import { judgeScorecardRepository } from "@/lib/repositories/judge-scorecard.repository";
import { onsiteOpsAccessService } from "@/lib/services/onsite-ops-access.service";

async function buildJudgeSummaryByMatch(eventId: string) {
  const assignments = await judgeAssignmentRepository.listByEvent(eventId);
  const scorecards = await judgeScorecardRepository.listByEvent(eventId);

  const byMatch = new Map<string, { assignedCount: number; submittedCount: number }>();
  for (const a of assignments) {
    const cur = byMatch.get(a.matchId) ?? { assignedCount: 0, submittedCount: 0 };
    cur.assignedCount += 1;
    byMatch.set(a.matchId, cur);
  }
  for (const s of scorecards) {
    if (
      s.status !== "submitted" &&
      s.status !== "revised" &&
      s.status !== "locked"
    ) {
      continue;
    }
    const cur = byMatch.get(s.matchId) ?? { assignedCount: 0, submittedCount: 0 };
    cur.submittedCount += 1;
    byMatch.set(s.matchId, cur);
  }
  return Object.fromEntries(byMatch);
}

export async function loadOnsiteOpsPortalPage(token: string) {
  const access = await onsiteOpsAccessService.resolveActiveToken(token);
  if (!access) return null;

  const caller = onsiteOpsAccessService.toFieldOpsCaller(access);

  const [fieldStatus, matches, judgeSummaryByMatch] = await Promise.all([
    fieldStatusService.listEventFieldStatus(caller, access.eventId),
    matchService.listEventMatches(caller, access.eventId),
    buildJudgeSummaryByMatch(access.eventId),
  ]);

  return {
    access,
    fieldStatus,
    matches,
    judgeSummaryByMatch,
  };
}
