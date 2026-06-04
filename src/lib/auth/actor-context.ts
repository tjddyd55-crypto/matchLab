import type { UserRole } from "@/lib/enums";

/**
 * Supabase 세션 + DB `User` + Organizer/Gym/Fighter 조합 (`roles-permissions.md`).
 */
export type ActorContext = {
  userId: string;
  role: UserRole;
  email: string;
  loginId?: string;
  mustChangePassword?: boolean;
  organizerId?: string;
  gymId?: string;
  fighterId?: string;
};
