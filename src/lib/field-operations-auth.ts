import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";

/** 주최자 세션 또는 현장 운영 토큰으로 field ops(계체·경기운영) 접근 */
export type FieldOperationsCaller =
  | { kind: "actor"; actor: ActorContext }
  | { kind: "onsite-ops"; eventId: string; linkId: string };

export async function assertFieldOperationsEventAccess(
  caller: FieldOperationsCaller,
  eventId: string,
): Promise<void> {
  if (caller.kind === "onsite-ops") {
    if (caller.eventId !== eventId) {
      throw new PermissionError(
        "FORBIDDEN",
        "해당 대회에 접근할 수 없습니다.",
      );
    }
    return;
  }
  requireRole(caller.actor, ["organizer", "admin"]);
  await requireOrganizerForEvent(caller.actor, eventId);
}

export function assertFieldOperationsActorRole(
  caller: FieldOperationsCaller,
): void {
  if (caller.kind === "onsite-ops") return;
  requireRole(caller.actor, ["organizer", "admin"]);
}

export function toActorCaller(actor: ActorContext): FieldOperationsCaller {
  return { kind: "actor", actor };
}
