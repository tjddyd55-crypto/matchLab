import { z } from "zod";
import {
  INTAKE_FORM_FIELD_TYPES,
} from "@/lib/intake-form/field-types";

const intakeFormFieldSchema = z.object({
  stableKey: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(200),
  type: z.enum(INTAKE_FORM_FIELD_TYPES as [string, ...string[]]),
  required: z.boolean().optional(),
  placeholder: z.string().trim().max(500).optional().nullable(),
  helpText: z.string().trim().max(1000).optional().nullable(),
  options: z.array(z.string().trim().min(1).max(200)).optional(),
  displayOrder: z.number().int().optional(),
});

export const intakeFormUpsertSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해 주세요.")
    .max(200, "제목은 200자 이내로 입력해 주세요."),
  description: z.string().trim().max(10000).optional().default(""),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
  startsAt: z.string().trim().optional().nullable(),
  closesAt: z.string().trim().optional().nullable(),
  maxSubmissions: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 99999) return null;
      return n;
    }),
  completionMessage: z.string().trim().max(2000).optional().nullable(),
  fields: z.array(intakeFormFieldSchema).optional().default([]),
});

export const intakeFormSubmissionStatusSchema = z.object({
  status: z.enum(["SUBMITTED", "APPROVED", "CANCELLED"]),
  adminMemo: z.string().trim().max(2000).optional().nullable(),
});

export type IntakeFormUpsertInput = z.infer<typeof intakeFormUpsertSchema>;
