import "server-only";

import { cookies } from "next/headers";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  authSecretFromEnv,
  isGoldenTestAuthEnabled,
  parseGoldenTestSessionToken,
  signGoldenTestSessionPayload,
} from "@/lib/auth/golden-test-auth-policy";
import {
  GOLDEN_CI_ORGANIZER_LOGIN_ID,
  GOLDEN_TEST_SESSION_COOKIE,
} from "@/lib/golden-flow/constants";
import { authService } from "@/lib/services/auth.service";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export {
  assertGoldenTestAuthSecret,
  isGoldenTestAuthEnabled,
  isGoldenTestAuthSecretConfigured,
} from "@/lib/auth/golden-test-auth-policy";

export async function resolveGoldenTestOrganizerUserId(): Promise<string | null> {
  return authService.findUserIdByLoginId(GOLDEN_CI_ORGANIZER_LOGIN_ID);
}

export function createGoldenTestSessionToken(userId: string): string | null {
  const secret = authSecretFromEnv();
  if (!secret) return null;
  const exp = Date.now() + SESSION_TTL_MS;
  return signGoldenTestSessionPayload(userId, exp, secret);
}

export async function setGoldenTestSessionCookie(userId: string): Promise<boolean> {
  if (!isGoldenTestAuthEnabled()) return false;
  const organizerUserId = await resolveGoldenTestOrganizerUserId();
  if (!organizerUserId || organizerUserId !== userId) return false;
  const token = createGoldenTestSessionToken(userId);
  if (!token) return false;
  const cookieStore = await cookies();
  cookieStore.set(GOLDEN_TEST_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return true;
}

export async function getActorFromGoldenTestSession(): Promise<ActorContext | null> {
  if (!isGoldenTestAuthEnabled()) return null;
  const secret = authSecretFromEnv();
  if (!secret) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(GOLDEN_TEST_SESSION_COOKIE)?.value;
  if (!token) return null;
  const parsed = parseGoldenTestSessionToken(token, secret);
  if (!parsed) return null;
  const organizerUserId = await resolveGoldenTestOrganizerUserId();
  if (!organizerUserId || parsed.userId !== organizerUserId) return null;
  return authService.getActorByUserId(organizerUserId);
}
