import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  toClientAdminPasswordResetTarget,
  type AdminPasswordResetClientTarget,
} from "@/lib/admin/admin-password-reset-client";
import { adminPasswordResetLinkService } from "@/lib/services/admin-password-reset-link.service";

export async function tryResolveAdminResetClientTarget(
  actor: ActorContext,
  userId: string | null | undefined,
): Promise<AdminPasswordResetClientTarget | null> {
  if (!userId) return null;
  try {
    const target = await adminPasswordResetLinkService.resolveTargetForAdminByUserId(
      actor,
      userId,
    );
    return toClientAdminPasswordResetTarget(target);
  } catch {
    return null;
  }
}
