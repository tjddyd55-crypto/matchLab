import { redirect } from "next/navigation";
import {
  dashboardPathForRole,
  getCurrentActor,
} from "@/lib/auth/actor";

export const dynamic = "force-dynamic";

/** 레거시 /register → /join 허브로 통일 */
export default async function RegisterPage() {
  const actor = await getCurrentActor();
  if (actor) {
    redirect(dashboardPathForRole(actor.role));
  }
  redirect("/join");
}
