import type { ActorContext } from "@/lib/auth/actor-context";
import type { ActorProfileRow } from "@/lib/repositories/user.repository";

export function actorProfileRowToContext(row: ActorProfileRow): ActorContext {
  const staffActive =
    row.gymStaff &&
    row.gymStaff.isActive &&
    row.gymStaff.deletedAt == null
      ? row.gymStaff
      : null;

  return {
    userId: row.id,
    role: row.role,
    email: row.email ?? "",
    loginId: row.loginId ?? undefined,
    mustChangePassword: row.mustChangePassword,
    organizerId: row.organizer?.id,
    organizerType: row.organizer?.type,
    gymId: row.ownedGym?.id ?? staffActive?.gymId,
    gymStaffId: staffActive?.id,
    fighterId: row.fighter?.id,
  };
}
