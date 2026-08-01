/**
 * 통합 캘린더 표시용 view model.
 * DB 모델(GymPersonalSchedule / GymGroupClass)은 분리 유지.
 */
export type GymCalendarItemType = "personal" | "group_class";

export type GymCalendarItem = {
  id: string;
  itemType: GymCalendarItemType;
  title: string;
  startsAt: Date;
  endsAt: Date;
  dateKey: string;
  timeRangeLabel: string;
  staffId: string | null;
  staffName: string | null;
  status: string;
  statusLabel: string;
  memberId: string | null;
  memberName: string | null;
  memberProfileImageUrl: string | null;
  groupClassId: string | null;
  participantCount: number | null;
  capacity: number | null;
  waitlistCount: number | null;
  colorKey: string | null;
  /** personal schedule fields */
  scheduleType?: string;
  scheduleTypeLabel?: string;
  memo?: string | null;
  location?: string | null;
  canManage: boolean;
};
