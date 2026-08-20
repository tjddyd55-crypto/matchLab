import { MatchonLogo } from "@/components/common/MatchonLogo";
import { dashboardSidebarBrandClass } from "@/lib/ui/dashboard-sidebar-ui";

export function SidebarBrand({ homeHref }: { homeHref: string }) {
  return (
    <div className={dashboardSidebarBrandClass}>
      <MatchonLogo href={homeHref} variant="dark" size="sm" />
    </div>
  );
}
