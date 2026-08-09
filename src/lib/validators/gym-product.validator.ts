import { z } from "zod";
import { GymProductCategory } from "@/lib/enums";

const wonIntOrZero = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}, z.number().int().nonnegative("기본가격이 올바르지 않습니다."));

export const gymProductCreateSchema = z.object({
  name: z.string().trim().min(1, "상품명을 입력해 주세요.").max(120),
  category: z
    .nativeEnum(GymProductCategory)
    .optional()
    .default(GymProductCategory.goods),
  defaultPrice: wonIntOrZero,
  memo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  isActive: z.boolean().optional().default(true),
});

export const gymProductUpdateSchema = gymProductCreateSchema;
