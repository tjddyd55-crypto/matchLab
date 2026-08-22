import { requireActor } from "@/lib/auth/actor";
import { redirectUnlessDashboardRole } from "@/lib/auth/actor";

/**
 * 출력 전용 route group — 사이드바/대시보드 셸 없음.
 */
export default async function BracketPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  return <>{children}</>;
}
