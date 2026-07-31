import "server-only";

import { redirect } from "next/navigation";
import type { ActorContext } from "@/lib/auth/actor-context";

/** 선생님(gym_staff) 대시보드 접근 전 임시 비밀번호 변경 게이트 */
export function requireGymStaffPasswordReady(actor: ActorContext): void {
  if (actor.role !== "gym_staff") return;
  if (actor.mustChangePassword) {
    redirect("/gym/change-password");
  }
}
