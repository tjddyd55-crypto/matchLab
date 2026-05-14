import "server-only";

import type { User } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { actorProfileRowToContext } from "@/lib/auth/map-profile-to-actor";
import { userRepository } from "@/lib/repositories/user.repository";

/**
 * 인증 주체 조립 — Repository만 사용하고 권한 판단은 하지 않는다.
 */
export const authService = {
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