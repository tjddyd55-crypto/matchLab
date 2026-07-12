import { formatCourtTabLabel } from "@/lib/court-tab-label";
import {
  formatOperationOrderLabel,
  getOperationMatchPhase,
  pickOperationSpotlightMatches,
  sortOperationMatchRows,
  type OperationSpotlightMatches,
} from "@/lib/match-operation-display";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import {
  resolveOperationDisplayStatus,
  type OperationDisplayStatus,
} from "@/lib/ui/matchon-status";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { toOperationMatchRow } from "@/components/domain/operation/operation-match-row";

export type CourtFieldStatusFilter = "all" | OperationDisplayStatus;

export type CourtFieldStatusBoardSummary = {
  totalCourts: number;
  inProgressCount: number;
  waitingCount: number;
  completedCount: number;
  cancelledCount: number;
};

export type CourtFieldStatusMatchCounts = {
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

export type CourtFieldStatusVM = {
  courtId: string;
  courtName: string;
  courtLabel: string;
  overallStatus: OperationDisplayStatus;
  matchCounts: CourtFieldStatusMatchCounts;
  rows: OperationMatchRowVM[];
  spotlight: OperationSpotlightMatches<OperationMatchRowVM>;
};

export function getMatchDisplayStatus(
  match: Pick<OrganizerEventMatchListItemVM, "status" | "hasOfficialResults">,
): OperationDisplayStatus {
  const phase = getOperationMatchPhase(match);
  return resolveOperationDisplayStatus({ status: match.status, phase });
}

export function summarizeCourtFieldStatusBoard(
  matches: OrganizerEventMatchListItemVM[],
  courts: EventCourtVM[],
): CourtFieldStatusBoardSummary {
  const activeCourts = courts.filter((court) => court.isActive);
  let inProgressCount = 0;
  let waitingCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const match of matches) {
    const status = getMatchDisplayStatus(match);
    if (status === "in_progress") inProgressCount += 1;
    else if (status === "waiting") waitingCount += 1;
    else if (status === "completed") completedCount += 1;
    else if (status === "cancelled") cancelledCount += 1;
  }

  return {
    totalCourts: activeCourts.length,
    inProgressCount,
    waitingCount,
    completedCount,
    cancelledCount,
  };
}

function countCourtMatchStatuses(
  rows: OperationMatchRowVM[],
): CourtFieldStatusMatchCounts {
  const counts: CourtFieldStatusMatchCounts = {
    waiting: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    const status = getMatchDisplayStatus(row);
    if (status === "waiting") counts.waiting += 1;
    else if (status === "in_progress") counts.inProgress += 1;
    else if (status === "completed") counts.completed += 1;
    else if (status === "cancelled") counts.cancelled += 1;
  }

  return counts;
}

function resolveCourtOverallStatus(
  rows: OperationMatchRowVM[],
  spotlight: OperationSpotlightMatches<OperationMatchRowVM>,
): OperationDisplayStatus {
  if (spotlight.current) {
    return getMatchDisplayStatus(spotlight.current);
  }
  if (spotlight.next) return "waiting";
  if (rows.length === 0) return "waiting";

  const statuses = rows.map((row) => getMatchDisplayStatus(row));
  if (statuses.every((status) => status === "cancelled")) {
    return "cancelled";
  }
  if (
    statuses.every(
      (status) => status === "completed" || status === "cancelled",
    )
  ) {
    return "completed";
  }
  return "waiting";
}

export function buildCourtFieldStatusList(
  matches: OrganizerEventMatchListItemVM[],
  courts: EventCourtVM[],
): CourtFieldStatusVM[] {
  const activeCourts = courts.filter((court) => court.isActive);

  return activeCourts.map((court, index) => {
    const courtMatches = matches.filter((match) => match.courtId === court.id);
    const rows = sortOperationMatchRows(
      courtMatches.map((match) => toOperationMatchRow(match)),
      court.id,
      courts,
    ).map((row) => ({
      ...row,
      orderLabel: formatOperationOrderLabel(row, court.id),
    }));

    const spotlight = pickOperationSpotlightMatches(rows);
    const overallStatus = resolveCourtOverallStatus(rows, spotlight);

    return {
      courtId: court.id,
      courtName: court.name,
      courtLabel: formatCourtTabLabel(court, index),
      overallStatus,
      matchCounts: countCourtMatchStatuses(rows),
      rows,
      spotlight,
    };
  });
}

export function matchesCourtFieldStatusFilter(
  court: CourtFieldStatusVM,
  filter: CourtFieldStatusFilter,
): boolean {
  if (filter === "all") return true;
  return court.overallStatus === filter;
}

export function courtFieldStatusCardVariant(
  status: OperationDisplayStatus,
): "default" | "selected" | "muted" | "success" | "danger" {
  switch (status) {
    case "in_progress":
      return "selected";
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    case "waiting":
    default:
      return "default";
  }
}
