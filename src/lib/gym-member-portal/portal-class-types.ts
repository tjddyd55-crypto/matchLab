/**
 * 회원 포털 그룹수업 표시용 타입 (client/server 공유).
 * service 구현은 gym-member-portal.service.ts 에 둔다.
 */
import type { PortalClassAction } from "@/lib/gym-member-portal/class-display";

export type PortalGroupClassItem = {
  id: string;
  title: string;
  description: string | null;
  dateKey: string;
  timeRangeLabel: string;
  instructorName: string | null;
  location: string | null;
  capacity: number | null;
  attendingCount: number;
  waitlistedCount: number;
  /** @deprecated use waitlistedCount */
  waitlistCount: number;
  myParticipationStatus: string | null;
  /** @deprecated use myParticipationStatus */
  myStatus: string | null;
  myWaitlistOrder: number | null;
  classStatus: string;
  visibility: string;
  statusLabel: string;
  capacityLabel: string;
  waitlistOrderLabel: string | null;
  action: PortalClassAction;
  canJoin: boolean;
  canCancel: boolean;
  started: boolean;
};
