"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OrganizerGlobalNavGroup } from "@/lib/navigation/organizer-global-navigation";
import { cn } from "@/lib/utils";

function itemActive(pathname: string, href: string): boolean {
  if (href === "/organizer") return pathname === "/organizer";
  if (href === "/organizer/member-gyms") {
    return (
      pathname === "/organizer/member-gyms" ||
      (/^\/organizer\/member-gyms\/[^/]+$/.test(pathname) &&
        !pathname.startsWith("/organizer/member-gyms/overview") &&
        !pathname.startsWith("/organizer/member-gyms/links") &&
        !pathname.startsWith("/organizer/member-gyms/applications") &&
        !pathname.startsWith("/organizer/member-gyms/settings"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OrganizerSidebarNav({
  groups,
}: {
  groups: OrganizerGlobalNavGroup[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          {group.label ? (
            <p className="px-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = itemActive(pathname, item.href);
              return (
                <li key={`${group.id}-${item.href}`}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-md px-2 py-2 text-sm transition-colors",
                      active
                        ? "bg-white/12 font-semibold text-white"
                        : "text-white/70 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
