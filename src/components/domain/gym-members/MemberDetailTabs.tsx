import Link from "next/link";
import {
  matchonUnderlineTabActiveClass,
  matchonUnderlineTabBaseClass,
  matchonUnderlineTabInactiveClass,
  matchonUnderlineTabsNavClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type MemberDetailTabId =
  | "overview"
  | "membership"
  | "schedule"
  | "participation";

export const MEMBER_DETAIL_TABS: {
  id: MemberDetailTabId;
  label: string;
}[] = [
  { id: "overview", label: "개요" },
  { id: "membership", label: "회원권·결제" },
  { id: "schedule", label: "일정" },
  { id: "participation", label: "참여" },
];

export function MemberDetailTabs({
  memberId,
  active,
  extraQuery,
}: {
  memberId: string;
  active: MemberDetailTabId;
  extraQuery?: Record<string, string | undefined>;
}) {
  return (
    <nav
      className={cn(matchonUnderlineTabsNavClass, "gap-1 sm:gap-2")}
      aria-label="회원 상세 탭"
    >
      {MEMBER_DETAIL_TABS.map((tab) => {
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(extraQuery ?? {})) {
          if (v) sp.set(k, v);
        }
        if (tab.id !== "overview") sp.set("tab", tab.id);
        const qs = sp.toString();
        const href = `/gym/members/${memberId}${qs ? `?${qs}` : ""}`;
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              matchonUnderlineTabBaseClass,
              "min-h-10 px-3 pt-1.5 text-[13px]",
              isActive
                ? matchonUnderlineTabActiveClass
                : matchonUnderlineTabInactiveClass,
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
