import "server-only";

import { requireActorFromMutation } from "@/lib/auth/actor";
import {
  toActorCaller,
  type FieldOperationsCaller,
} from "@/lib/field-operations-auth";
import { onsiteOpsAccessService } from "@/lib/services/onsite-ops-access.service";

export function readOpsTokenFromForm(formData?: FormData | null): string | null {
  if (!formData) return null;
  const raw = formData.get("opsToken");
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export async function resolveFieldOpsCallerFromMutation(
  formData?: FormData | null,
): Promise<FieldOperationsCaller> {
  const token = readOpsTokenFromForm(formData);
  if (token) {
    const access = await onsiteOpsAccessService.assertActiveToken(token);
    return onsiteOpsAccessService.toFieldOpsCaller(access);
  }
  const actor = await requireActorFromMutation();
  return toActorCaller(actor);
}

export async function resolveFieldOpsCallerFromToken(
  opsToken: string,
): Promise<FieldOperationsCaller> {
  const access = await onsiteOpsAccessService.assertActiveToken(opsToken);
  return onsiteOpsAccessService.toFieldOpsCaller(access);
}
