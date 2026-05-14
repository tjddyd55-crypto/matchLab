import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";

export type DashboardRole = "organizer" | "gym" | "fighter" | "admin";

export function DashboardShell({
  role,
  actorUserId,
  actorEmail,
  children,
}: {
  role: DashboardRole;
  /** 인앱 알림 벨 — 로그인 사용자 id */
  actorUserId: string;
  /** 헤더에 표시할 로그인 이메일(서버에서 전달) */
  actorEmail: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar className="hidden w-56 shrink-0 border-r md:flex" role={role} />
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <Header
          variant="dashboard"
          role={role}
          actorUserId={actorUserId}
          actorEmail={actorEmail}
        />
        <main className="flex-1">{children}</main>
      </div>
      <MobileBottomNav className="md:hidden" role={role} />
    </div>
  );
}
