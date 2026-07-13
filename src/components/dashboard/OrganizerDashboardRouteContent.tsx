"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { OrganizerDashboardContent } from "@/components/dashboard/OrganizerDashboardContent";
import { isOrganizerEventManagementPath } from "@/lib/organizer-route-path";

export function OrganizerDashboardRouteContent({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";

  if (isOrganizerEventManagementPath(pathname)) {
    return <div className="w-full min-w-0">{children}</div>;
  }

  return <OrganizerDashboardContent>{children}</OrganizerDashboardContent>;
}
