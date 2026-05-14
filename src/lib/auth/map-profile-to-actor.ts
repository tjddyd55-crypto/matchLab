import type { ActorContext } from "@/lib/auth/actor-context";
import type { ActorProfileRow } from "@/lib/repositories/user.repository";

export function actorProfileRowToContext(row: ActorProfileRow): ActorContext {
  return {
    userId: row.id,
    role: row.role,
    email: row.email ?? "",
    organizerId: row.organizer?.id,
    gymId: row.ownedGym?.id,
    fighterId: row.fighter?.id,
  };
}
