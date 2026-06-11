"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  external?: boolean;
};

function isNavItemActive(
  pathname: string,
  eventId: string,
  item: NavItem,
): boolean {
  if (item.external) return false;

  const base = `/organizer/events/${eventId}`;

  if (item.href === base) {
    return pathname === base;
  }

  if (item.href.startsWith(`${base}#`)) {
    return pathname === base;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function EventManagementNav({
  eventId,
  publicSlug,
}: {
  eventId: string;
  publicSlug?: string | null;
}) {
  const pathname = usePathname() ?? "";

  const base = `/organizer/events/${eventId}`;
  const items: NavItem[] = [
    { href: base, label: "관리 홈" },
    { href: `${base}#setup-basic`, label: "기본 설정" },
    { href: `${base}#setup-divisions`, label: "부문·체급" },
    { href: `${base}#setup-application-form`, label: "신청서" },
    { href: `${base}#setup-payment`, label: "참가비" },
    { href: `${base}/applications`, label: "신청자" },
    { href: `${base}/check-in`, label: "현장·계체" },
    { href: `${base}/brackets`, label: "대진표" },
    { href: `${base}/operation`, label: "경기 운영" },
    { href: `${base}/judges`, label: "심판 관리" },
    { href: `${base}/results`, label: "결과" },
    { href: `${base}#setup-staff-links`, label: "스태프 링크" },
    ...(publicSlug
      ? [
          {
            href: `/events/${publicSlug}`,
            label: "공개 공고",
            external: true,
          } satisfies NavItem,
        ]
      : []),
    { href: `${base}/application-batches`, label: "공식 신청서" },
    { href: `${base}/live`, label: "라이브 URL" },
  ];

  return (
    <nav
      className="flex flex-wrap gap-2 border-b pb-4"
      aria-label="대회 관리 바로가기"
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, eventId, item);
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={cn(
              buttonVariants({
                variant: active ? "default" : "outline",
                size: "sm",
              }),
              "justify-center",
            )}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
