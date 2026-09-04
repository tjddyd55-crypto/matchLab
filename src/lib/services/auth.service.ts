import "server-only";

import type { User } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { actorProfileRowToContext } from "@/lib/auth/map-profile-to-actor";
import {
  isEmailLoginIdentifier,
  loginIdToAuthEmail,
  normalizeLoginId,
} from "@/lib/fighter-login";
import { isSyntheticAuthEmail } from "@/lib/member-gym/owner-account";
import { userRepository } from "@/lib/repositories/user.repository";

/**
 * 인증 주체 조립 — Repository만 사용하고 권한 판단은 하지 않는다.
 */
function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const authService = {
  /**
   * 로그인 identifier(아이디 또는 이메일) → Supabase Auth email.
   * 모든 User.role 지원. identifier를 Supabase에 그대로 넘기지 않습니다.
   *
   * loginId 기반 계정 SSOT: Auth email = loginIdToAuthEmail(loginId).
   * User.email에 연락처가 잘못 저장된 회원사(초대 활성화 회귀)는
   * synthetic Auth email로 해석한다. @demo.local 등 기존 이메일 Auth는 유지.
   */
  async resolveAuthEmailForLogin(identifier: string): Promise<string | null> {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    if (isEmailLoginIdentifier(trimmed)) {
      return normalizeAuthEmail(trimmed);
    }

    const loginId = normalizeLoginId(trimmed);
    const byLoginId = await userRepository.findUserByLoginId(loginId);
    if (byLoginId?.loginId) {
      const synthetic = normalizeAuthEmail(loginIdToAuthEmail(byLoginId.loginId));
      const stored = byLoginId.email
        ? normalizeAuthEmail(byLoginId.email)
        : null;

      if (!stored) return synthetic;

      // 데모·레거시: User.email이 곧 Auth email
      if (stored.endsWith("@demo.local")) return stored;

      // 이미 Auth SSOT와 일치
      if (stored === synthetic || isSyntheticAuthEmail(stored)) {
        return synthetic;
      }

      // 회원사 초대 버그 복구: User.email=신청 이메일, Auth=synthetic
      if (byLoginId.role === "gym") {
        return synthetic;
      }

      return stored;
    }

    // loginId 미기입 DB: 데모 @demo.local / 내부 auth email 하위 호환
    const demoEmail = `${loginId}@demo.local`;
    const demoUser = await userRepository.findUserByEmail(demoEmail);
    if (demoUser?.email) {
      return normalizeAuthEmail(demoUser.email);
    }

    const internalEmail = loginIdToAuthEmail(loginId);
    const internalUser = await userRepository.findUserByEmail(internalEmail);
    if (internalUser?.email) {
      return normalizeAuthEmail(internalUser.email);
    }

    return null;
  },

  async getActorByAuthUserId(authUserId: string): Promise<ActorContext | null> {
    const row =
      await userRepository.findActorProfileByAuthUserId(authUserId);
    if (!row) return null;
    return actorProfileRowToContext(row);
  },

  /** Supabase Auth `user.id`로 DB `User` 단건 조회(프로필 매핑 확인용). */
  async findUserByAuthUserId(authUserId: string): Promise<User | null> {
    return userRepository.findUserByAuthUserId(authUserId);
  },

  async findUserIdByLoginId(loginId: string): Promise<string | null> {
    const row = await userRepository.findUserByLoginId(loginId);
    return row?.id ?? null;
  },

  async getActorByUserId(userId: string): Promise<ActorContext | null> {
    const row = await userRepository.findActorProfileByUserId(userId);
    if (!row) return null;
    return actorProfileRowToContext(row);
  },

  /**
   * MVP에서는 사용하지 않습니다. 시연·운영 계정은 `User.authUserId`가
   * Supabase `user.id`와 미리 일치해야 합니다 (`docs/dev-start.md`).
   */
  async ensureUserProfileFromSupabaseAuth(_input: {
    authUserId: string;
    email: string | undefined;
  }): Promise<never> {
    void _input;
    throw new Error(
      "MVP: 자동 User 생성·역할 배정은 미구현입니다. docs/dev-start.md의 authUserId 매핑 절차를 따르세요.",
    );
  },
};