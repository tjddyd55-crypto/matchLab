import type { ZodError } from "zod";
import { actionFailure, type ActionFailure } from "@/lib/action-result";

export type FormFieldErrors = Record<string, string[]>;

export function zodFlattenToFieldErrors(details: unknown): FormFieldErrors {
  if (!details || typeof details !== "object") return {};
  const fieldErrors = (details as { fieldErrors?: FormFieldErrors }).fieldErrors;
  return fieldErrors ?? {};
}

export function zodErrorToSummary(
  error: ZodError,
  fallback = "입력값을 확인해 주세요.",
): string {
  const flat = error.flatten();
  for (const msgs of Object.values(flat.fieldErrors) as string[][]) {
    const first = msgs?.[0]?.trim();
    if (first) return first;
  }
  const formFirst = flat.formErrors[0]?.trim();
  if (formFirst) return formFirst;
  return fallback;
}

export function validationFailureFromZod(error: ZodError): ActionFailure {
  return actionFailure(
    "VALIDATION_ERROR",
    zodErrorToSummary(error),
    error.flatten(),
  );
}
