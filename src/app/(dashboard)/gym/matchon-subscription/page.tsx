import { redirect } from "next/navigation";

/** Bookmark compatibility — canonical path is /gym/billing/account */
export default function GymMatchonSubscriptionRedirectPage() {
  redirect("/gym/billing/account");
}
