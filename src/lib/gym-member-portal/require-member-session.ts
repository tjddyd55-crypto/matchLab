import { redirect } from "next/navigation";
import {
  gymMemberPortalService,
  type PortalSessionContext,
} from "@/lib/services/gym-member-portal.service";

export async function requireMemberPortalPageSession(
  token: string,
): Promise<PortalSessionContext> {
  const resolved = await gymMemberPortalService.resolvePortal(token);
  if (!resolved.ok) {
    redirect(`/member-portal/${token}`);
  }
  const session = await gymMemberPortalService.requireSession(token);
  if (!session) {
    redirect(`/member-portal/${token}`);
  }
  return session;
}
