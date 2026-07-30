import { z } from "zod";
import {
  GymGroupClassStatus,
  GymGroupClassVisibility,
} from "@/lib/enums";
import { GYM_GROUP_CLASS_CAPACITY_MAX } from "@/lib/gym-group-class/labels";

const hmRegex = /^\d{1,2}:\d{2}$/;
const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const gymGroupClassCreateSchema = z.object({
  title: z.string().trim().min(1, "수업명을 입력해 주세요.").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  instructorStaffId: z.string().trim().min(1).optional().or(z.literal("")),
  dateKey: z.string().regex(dateKeyRegex, "날짜 형식이 올바르지 않습니다."),
  startHm: z.string().regex(hmRegex, "시작 시각 형식이 올바르지 않습니다."),
  endHm: z.string().regex(hmRegex, "종료 시각 형식이 올바르지 않습니다."),
  capacity: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > GYM_GROUP_CLASS_CAPACITY_MAX) {
        ctx.addIssue({
          code: "custom",
          message: `정원은 1~${GYM_GROUP_CLASS_CAPACITY_MAX} 사이 정수여야 합니다.`,
        });
        return z.NEVER;
      }
      return n;
    }),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  visibility: z.nativeEnum(GymGroupClassVisibility).optional(),
  colorKey: z.string().trim().max(40).optional().or(z.literal("")),
});

export const gymGroupClassUpdateSchema = gymGroupClassCreateSchema;

export const gymGroupClassCancelSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const gymGroupClassAddParticipantSchema = z.object({
  gymMemberId: z.string().trim().min(1, "회원을 선택해 주세요."),
});

export type GymGroupClassCreateInput = z.infer<typeof gymGroupClassCreateSchema>;
export type GymGroupClassUpdateInput = z.infer<typeof gymGroupClassUpdateSchema>;
