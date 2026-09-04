import "server-only";

import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/enums";
import type { ActorContext } from "@/lib/auth/actor-context";
import { getActorFromGoldenTestSession } from "@/lib/auth/golden-test-auth";
import { PermissionError } from "@/lib/auth/permission-error";
import { authService } from "@/lib/services/auth.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type { ActorContext } from "@/lib/auth/actor-context";

/** 역할별 대시보드 진입 경로 */
export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "organizer":
      return "/organizer";
    case "gym":
    case "gym_staff":
      return "/gym";
    case "fighter":
      return "/fighter";
    default:
      return "/";
  }
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isSupabaseAuthConfigured(): boolean {
  return isSupabaseConfigured();
}

/**
 * 현재 요청의 Supabase 사용자와 DB 프로필을 조합한다.
 * 세션 없음 → null. DB에 authUserId 매칭 User 없음 → null(onboarding·수동 연결 필요).
 */
export async function getCurrentActor(): Promise<ActorContext | null> {
  const goldenActor = await getActorFromGoldenTestSession();
  if (goldenActor) return goldenActor;

  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) return null;

  return authService.getActorByAuthUserId(user.id);
}

/** Supabase Auth `user.id`(UUID)만 알 때 — 배치·웹훅 등 서버 전용 */
export async function getActorFromSupabaseUserId(
  authUserId: string,
): Promise<ActorContext | null> {
  return authService.getActorByAuthUserId(authUserId);
}

/** Server Component / 레이아웃용 — 미인증 시 로그인으로 보낸다. */
export async function requireActor(): Promise<ActorContext> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  return actor;
}

/** Server Action·Route Handler용 — `PermissionError`(UNAUTHORIZED). */
export async function requireActorFromMutation(): Promise<ActorContext> {
  const actor = await getCurrentActor();
  if (!actor) {
    throw new PermissionError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  return actor;
}

/** 허용 역할이 아니면 홈으로 — 존재·역할 노출 최소화용 UX */
export function redirectUnlessDashboardRole(
  actor: ActorContext,
  allowed: readonly UserRole[],
): void {
  if (!allowed.includes(actor.role)) {
    redirect("/");
  }
}
