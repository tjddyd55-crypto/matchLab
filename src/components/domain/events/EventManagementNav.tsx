"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem =
  | {
      kind: "anchor";
      href: string;
      label: string;
      hash: string;
    }
  | {
      kind: "route";
      href: string;
      label: string;
      matchPath: string;
    }
  | {
      kind: "external";
      href: string;
      label: string;
    };

function buildItems(eventId: string, publicSlug: string): NavItem[] {
  const base = `/organizer/events/${eventId}`;
  return [
    { kind: "route", href: base, label: "관리 홈", matchPath: base },
    {
      kind: "anchor",
      href: `${base}#setup-basic`,
      label: "기본 설정",
      hash: "setup-basic",
    },
    {
      kind: "anchor",
      href: `${base}#setup-divisions`,
      label: "부문·체급",
      hash: "setup-divisions",
    },
    {
      kind: "anchor",
      href: `${base}#setup-application-form`,
      label: "신청서",
      hash: "setup-application-form",
    },
    {
      kind: "anchor",
      href: `${base}#setup-payment`,
      label: "참가비",
      hash: "setup-payment",
    },
    {
      kind: "route",
      href: `${base}/applications`,
      label: "신청자",
      matchPath: `${base}/applications`,
    },
    {
      kind: "route",
      href: `${base}/check-in`,
      label: "현장·계체",
      matchPath: `${base}/check-in`,
    },
    {
      kind: "route",
      href: `${base}/brackets`,
      label: "대진표",
      matchPath: `${base}/brackets`,
    },
    {
      kind: "route",
      href: `${base}/operation`,
      label: "경기 운영",
      matchPath: `${base}/operation`,
    },
    {
      kind: "route",
      href: `${base}/judges`,
      label: "심판 관리",
      matchPath: `${base}/judges`,
    },
    {
      kind: "route",
      href: `${base}/results`,
      label: "결과",
      matchPath: `${base}/results`,
    },
    {
      kind: "anchor",
      href: `${base}#setup-staff-links`,
      label: "스태프 링크",
      hash: "setup-staff-links",
    },
    {
      kind: "external",
      href: `/events/${publicSlug}`,
      label: "공개 공고",
    },
    {
      kind: "route",
      href: `${base}/application-batches`,
      label: "공식 신청서",
      matchPath: `${base}/application-batches`,
    },
    {
      kind: "route",
      href: `${base}/live`,
      label: "라이브 URL",
      matchPath: `${base}/live`,
    },
  ];
}

function isRouteActive(
  pathname: string,
  matchPath: string,
  homePath: string,
): boolean {
  if (matchPath === homePath) {
    return pathname === homePath;
  }
  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

export function EventManagementNav({
  eventId,
  publicSlug,
}: {
  eventId: string;
  publicSlug: string;
}) {
  const pathname = usePathname();
  const homePath = `/organizer/events/${eventId}`;
  const items = buildItems(eventId, publicSlug);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash.replace(/^#/, ""));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const linkClass = (active: boolean) =>
    cn(
      buttonVariants({ variant: active ? "default" : "outline", size: "sm" }),
      "justify-center",
    );

  return (
    <nav
      className="flex flex-wrap gap-2 border-b pb-4"
      aria-label="대회 관리 바로가기"
    >
      {items.map((item) => {
        const key =
          item.label + (item.kind === "anchor" ? item.hash : item.href);

        if (item.kind === "external") {
          return (
            <Link
              key={key}
              href={item.href}
              className={linkClass(false)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.label}
            </Link>
          );
        }

        if (item.kind === "anchor") {
          const active =
            pathname === homePath && hash === item.hash;
          return (
            <Link key={key} href={item.href} className={linkClass(active)} scroll>
              {item.label}
            </Link>
          );
        }

        const active = isRouteActive(pathname, item.matchPath, homePath);
        return (
          <Link key={key} href={item.href} className={linkClass(active)}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
