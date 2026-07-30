import { z } from "zod";
import {
  GymPersonalScheduleStatus,
  GymPersonalScheduleType,
} from "@/lib/enums";

const hm = z
  .string()
  .regex(/^\d{1,2}:\d{2}$/, "시각 형식이 올바르지 않습니다.");

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");

export const gymScheduleCreateSchema = z.object({
  gymStaffId: z.string().min(1, "선생님을 선택해 주세요."),
  gymMemberId: z.string().min(1, "회원을 선택해 주세요."),
  dateKey,
  startHm: hm,
  endHm: hm,
  scheduleType: z.nativeEnum(GymPersonalScheduleType).default(
    GymPersonalScheduleType.personal_training,
  ),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  memo: z.string().trim().max(2000).optional().or(z.literal("")),
  colorKey: z.string().trim().max(32).optional().or(z.literal("")),
});

export const gymScheduleUpdateSchema = gymScheduleCreateSchema;

export const gymScheduleCancelSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const gymScheduleStatusFilterSchema = z
  .union([
    z.literal("all"),
    z.literal("active"),
    z.nativeEnum(GymPersonalScheduleStatus),
  ])
  .default("active");

export type GymScheduleCreateInput = z.infer<typeof gymScheduleCreateSchema>;
export type GymScheduleUpdateInput = z.infer<typeof gymScheduleUpdateSchema>;
