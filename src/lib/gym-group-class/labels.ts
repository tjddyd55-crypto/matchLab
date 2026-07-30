import type {
  GymGroupClassParticipationStatus,
  GymGroupClassStatus,
  GymGroupClassVisibility,
} from "@/lib/enums";

export const GYM_GROUP_CLASS_STATUS_LABEL: Record<GymGroupClassStatus, string> =
  {
    scheduled: "예정",
    completed: "완료",
    cancelled: "취소",
  };

export const GYM_GROUP_CLASS_VISIBILITY_LABEL: Record<
  GymGroupClassVisibility,
  string
> = {
  members_only: "회원 전용",
  public: "공개",
};

export const GYM_GROUP_CLASS_PARTICIPATION_STATUS_LABEL: Record<
  GymGroupClassParticipationStatus,
  string
> = {
  attending: "참석",
  waitlisted: "대기",
  cancelled: "취소",
  not_attending: "불참",
};

export const GYM_GROUP_CLASS_STATUS_OPTIONS = (
  Object.keys(GYM_GROUP_CLASS_STATUS_LABEL) as GymGroupClassStatus[]
).map((value) => ({ value, label: GYM_GROUP_CLASS_STATUS_LABEL[value] }));

export const GYM_GROUP_CLASS_VISIBILITY_OPTIONS = (
  Object.keys(GYM_GROUP_CLASS_VISIBILITY_LABEL) as GymGroupClassVisibility[]
).map((value) => ({
  value,
  label: GYM_GROUP_CLASS_VISIBILITY_LABEL[value],
}));

export const GYM_GROUP_CLASS_CAPACITY_MAX = 999;
