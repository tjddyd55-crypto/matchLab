import "server-only";

import { redirect } from "next/navigation";
import type { ActorContext } from "@/lib/auth/actor-context";
import { fighterAccountService } from "@/lib/services/fighter-account.service";

/** 선수 대시보드 본 기능 접근 전 게이트 */
export async function requireFighterDashboardReady(
  actor: ActorContext,
): Promise<void> {
  if (actor.role !== "fighter") return;

  if (actor.mustChangePassword) {
    redirect("/fighter/change-password");
  }

  if (!actor.fighterId) {
    const gate = await fighterAccountService.getFighterRegistrationGate(actor);
    if (gate.kind === "pending") redirect("/fighter/pending");
    if (gate.kind === "rejected") redirect("/fighter/rejected");
    redirect("/fighter/unlinked");
  }
}
