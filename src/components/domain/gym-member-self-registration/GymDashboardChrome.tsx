"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";

type Props = {
  children: React.ReactNode;
  role: "gym";
  actorUserId: string;
  actorEmail: string;
  gymNavViewer: "staff" | "owner";
};

/** 셀프등록 인쇄 페이지는 sidebar/header 없이 용지 레이아웃만 렌더한다. */
export function GymDashboardChrome({
  children,
  role,
  actorUserId,
  actorEmail,
  gymNavViewer,
}: Props) {
  const pathname = usePathname();
  if (pathname.includes("/self-registration/print")) {
    return <>{children}</>;
  }
  return (
    <AppShell>
      <DashboardShell
        role={role}
        actorUserId={actorUserId}
        actorEmail={actorEmail}
        gymNavViewer={gymNavViewer}
      >
        {children}
      </DashboardShell>
    </AppShell>
  );
}
