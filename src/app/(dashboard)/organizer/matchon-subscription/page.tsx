import { redirect } from "next/navigation";

/** Bookmark compatibility — canonical path is /organizer/billing/account */
export default function OrganizerMatchonSubscriptionRedirectPage() {
  redirect("/organizer/billing/account");
}
