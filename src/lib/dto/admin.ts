import type {
  ApplicationStatus,
  AuditAction,
  BracketMatchOutcomeStyle,
  EventStatus,
  FighterStatus,
  GymStatus,
  MatchRecordOutcome,
  MatchRecordStatus,
  OrganizerStatus,
  OrganizerType,
  PaymentStatus,
} from "@/generated/prisma";

export type AdminDashboardStatsDTO = {
  totalEvents: number;
  openEvents: number;
  ongoingEvents: number;
  finishedEvents: number;
  totalOrganizers: number;
  totalGyms: number;
  totalFighters: number;
  totalApplications: number;
  approvedApplications: number;
  pendingApplications: number;
  totalMatches: number;
  confirmedResults: number;
  totalMatchResults: number;
};

export type AdminEventListItemDTO = {
  id: string;
  title: string;
  status: EventStatus;
  eventDate: string;
  publicSlug: string;
  organizerId: string;
  organizerName: string;
  applicationCount: number;
  bracketCount: number;
};

export type AdminOrganizerListItemDTO = {
  id: string;
  name: string;
  type: OrganizerType;
  status: OrganizerStatus;
  eventCount: number;
  createdAt: string;
};

export type AdminGymListItemDTO = {
  id: string;
  name: string;
  status: GymStatus;
  fighterCount: number;
  applicationCount: number;
  createdAt: string;
};

export type AdminFighterListItemDTO = {
  id: string;
  fighterCode: string;
  name: string;
  gender: string;
  currentGymName: string | null;
  recordSummary: string;
  status: FighterStatus;
  createdAt: string;
};

export type AdminApplicationListItemDTO = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventPublicSlug: string;
  fighterId: string;
  fighterName: string;
  fighterCode: string;
  gymId: string;
  gymName: string;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
};

export type AdminMatchResultListItemDTO = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventPublicSlug: string;
  fighterName: string;
  fighterCode: string;
  opponentName: string | null;
  opponentCode: string | null;
  result: MatchRecordOutcome;
  resultType: BracketMatchOutcomeStyle | null;
  status: MatchRecordStatus;
  matchDate: string;
  confirmedAt: string | null;
  createdAt: string;
};

export type AdminAuditLogListItemDTO = {
  id: string;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  actorLabel: string;
  createdAt: string;
};

export type AdminDashboardHomeDTO = {
  stats: AdminDashboardStatsDTO;
  recentEvents: AdminEventListItemDTO[];
  recentApplications: AdminApplicationListItemDTO[];
  recentMatchResults: AdminMatchResultListItemDTO[];
  recentAuditLogs: AdminAuditLogListItemDTO[];
};
