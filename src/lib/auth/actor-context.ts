import type { OrganizerType, UserRole } from "@/lib/enums";

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
  /** 주최자(organizer)인 경우 Organizer.type — 회원사 관리 association gate */
  organizerType?: OrganizerType;
  gymId?: string;
  /** role=gym_staff 일 때 활성 GymStaff.id */
  gymStaffId?: string;
  fighterId?: string;
};
