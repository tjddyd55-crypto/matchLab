import "server-only";

import { redirect } from "next/navigation";
import {
  judgeCredentialService,
  type ResolvedJudgeSession,
} from "@/lib/services/judge-credential.service";
import { judgeDefaultRoute } from "@/lib/judge-identity";

export async function assertJudgeSessionOrRedirect(): Promise<ResolvedJudgeSession> {
  try {
    return await judgeCredentialService.assertJudgeSession();
  } catch {
    redirect("/judge/login");
  }
}

/** 본인 확인 완료 필수 — 미완료 시 /judge/verify */
export async function assertJudgeIdentityOrRedirect(
  session: ResolvedJudgeSession,
): Promise<ResolvedJudgeSession> {
  if (!session.identityConfirmedAt) {
    redirect("/judge/verify");
  }
  return session;
}

export async function requireJudgeSessionWithIdentity(): Promise<ResolvedJudgeSession> {
  const session = await assertJudgeSessionOrRedirect();
  return assertJudgeIdentityOrRedirect(session);
}

export function redirectIfIdentityConfirmed(session: ResolvedJudgeSession): void {
  if (session.identityConfirmedAt) {
    redirect(judgeDefaultRoute(session.role));
  }
}
