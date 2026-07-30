import type {
  GymPersonalScheduleStatus,
  GymPersonalScheduleType,
} from "@/lib/enums";

export const GYM_PERSONAL_SCHEDULE_TYPE_LABEL: Record<
  GymPersonalScheduleType,
  string
> = {
  personal_training: "개인 PT",
  consultation: "상담",
  body_check: "신체 측정",
  rehabilitation: "재활 운동",
  other: "기타",
};

export const GYM_PERSONAL_SCHEDULE_STATUS_LABEL: Record<
  GymPersonalScheduleStatus,
  string
> = {
  scheduled: "예정",
  completed: "완료",
  cancelled: "취소",
  no_show: "노쇼",
};

export const GYM_PERSONAL_SCHEDULE_TYPE_OPTIONS = (
  Object.keys(GYM_PERSONAL_SCHEDULE_TYPE_LABEL) as GymPersonalScheduleType[]
).map((value) => ({
  value,
  label: GYM_PERSONAL_SCHEDULE_TYPE_LABEL[value],
}));

/** MATCHON token-aligned limited palette keys (not free hex) */
export const GYM_STAFF_COLOR_KEYS = [
  "blue",
  "teal",
  "amber",
  "rose",
  "violet",
  "slate",
] as const;

export type GymStaffColorKey = (typeof GYM_STAFF_COLOR_KEYS)[number];

export function gymStaffColorClass(colorKey: string | null | undefined): string {
  switch (colorKey) {
    case "teal":
      return "bg-teal-100 text-teal-900 ring-teal-200";
    case "amber":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case "rose":
      return "bg-rose-100 text-rose-900 ring-rose-200";
    case "violet":
      return "bg-violet-100 text-violet-900 ring-violet-200";
    case "slate":
      return "bg-slate-100 text-slate-900 ring-slate-200";
    case "blue":
    default:
      return "bg-sky-100 text-sky-900 ring-sky-200";
  }
}
