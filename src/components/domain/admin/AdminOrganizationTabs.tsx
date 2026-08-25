import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminOrganizationTabItem = {
  id: string;
  label: string;
};

export function AdminOrganizationTabs({
  baseHref,
  activeTab,
  tabs,
}: {
  baseHref: string;
  activeTab: string;
  tabs: AdminOrganizationTabItem[];
}) {
  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-matchon-border"
      aria-label="조직 상세 탭"
    >
      {tabs.map((tab) => {
        const href =
          tab.id === tabs[0]?.id
            ? baseHref
            : `${baseHref}?tab=${encodeURIComponent(tab.id)}`;
        const active = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-b-2 border-matchon-primary text-matchon-primary"
                : "text-matchon-text-secondary hover:text-matchon-text",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
