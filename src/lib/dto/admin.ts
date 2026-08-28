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
  ownerUserId: string;
  loginId: string | null;
};

/** Organizer(type=association) — 협회 목록 SSOT */
export type AdminAssociationListItemDTO = {
  id: string;
  name: string;
  status: OrganizerStatus;
  representativeName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  memberGymCount: number;
  creditBalance: number;
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
  loginId: string | null;
};

export type AdminAssociationLinkedGymDTO = {
  membershipId: string;
  gymId: string;
  gymName: string;
  status: string;
  joinedAt: string;
  memberCode: string;
};

export type AdminAssociationEventDTO = {
  id: string;
  title: string;
  status: EventStatus;
  eventDate: string;
  publicSlug: string;
};

export type AdminOrganizationCreditLedgerDTO = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  memo: string | null;
  createdAt: string;
};

export type AdminAssociationDetailDTO = {
  id: string;
  name: string;
  type: OrganizerType;
  status: OrganizerStatus;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
  loginId: string | null;
  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
  /** 승인된 가입 신청이 있으면 신청서 스냅샷 */
  application: {
    id: string;
    representativeName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    addressLabel: string | null;
    reviewedAt: string | null;
    submittedAt: string;
  } | null;
  summary: {
    memberGymCount: number;
    eventCount: number;
    creditBalance: number;
  };
  linkedGyms: AdminAssociationLinkedGymDTO[];
  events: AdminAssociationEventDTO[];
  creditLedgers: AdminOrganizationCreditLedgerDTO[];
  auditLogs: AdminAuditLogListItemDTO[];
};

export type AdminGymListItemDTO = {
  id: string;
  name: string;
  status: GymStatus;
  fighterCount: number;
  applicationCount: number;
  createdAt: string;
  ownerUserId: string;
  loginId: string | null;
};

export type AdminGymAssociationLinkDTO = {
  membershipId: string;
  organizerId: string;
  associationName: string;
  status: string;
  joinedAt: string;
};

export type AdminGymEventParticipationDTO = {
  eventId: string;
  eventTitle: string;
  eventStatus: EventStatus;
  eventDate: string;
  applicationCount: number;
};

export type AdminGymDetailDTO = {
  id: string;
  name: string;
  status: GymStatus;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
  loginId: string | null;
  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
  application: {
    id: string;
    representativeName: string;
    contactName: string;
    mobilePhone: string;
    email: string;
    addressLabel: string | null;
    businessNo: string | null;
    reviewedAt: string | null;
    submittedAt: string;
  } | null;
  summary: {
    memberCount: number;
    fighterCount: number;
    associationLinkCount: number;
    eventParticipationCount: number;
  };
  associationLinks: AdminGymAssociationLinkDTO[];
  eventParticipations: AdminGymEventParticipationDTO[];
  auditLogs: AdminAuditLogListItemDTO[];
};

export type AdminFighterListItemDTO = {
  id: string;
  fighterCode: string;
  name: string;
  gender: string;
  currentGymName: string | null;
  recordSummary: string;
  careerSummary: string | null;
  lastMatchAt: string | null;
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
