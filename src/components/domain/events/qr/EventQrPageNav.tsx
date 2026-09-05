"use client";

import { useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const EVENT_QR_SECTION_IDS = {
  public: "public-qr",
  judge: "judge-qr",
  onsiteOps: "onsite-ops",
} as const;

export function eventQrSectionHref(
  eventId: string,
  section: keyof typeof EVENT_QR_SECTION_IDS,
): string {
  return `/organizer/events/${eventId}/qr#${EVENT_QR_SECTION_IDS[section]}`;
}

const NAV_ITEMS: {
  id: (typeof EVENT_QR_SECTION_IDS)[keyof typeof EVENT_QR_SECTION_IDS];
  label: string;
  description: string;
}[] = [
  {
    id: EVENT_QR_SECTION_IDS.public,
    label: "공개 대회 QR",
    description: "대진표·결과 등 관람용",
  },
  {
    id: EVENT_QR_SECTION_IDS.judge,
    label: "채점심판 QR",
    description: "심판 직접 채점·주심",
  },
  {
    id: EVENT_QR_SECTION_IDS.onsiteOps,
    label: "운영관리 QR",
    description: "계체·경기운영 모바일 운영",
  },
];

export function EventQrPageNav() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <nav
      aria-label="QR 출력 메뉴"
      className="mb-6 grid gap-2 sm:grid-cols-3 print:hidden"
    >
      {NAV_ITEMS.map((item, index) => (
        <Link
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40",
            item.id === EVENT_QR_SECTION_IDS.onsiteOps &&
              "border-amber-200/80 bg-amber-50/40",
          )}
        >
          <p className="text-muted-foreground text-[11px] font-medium">
            {index + 1}. {item.label}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-[#0F172A]">
            {item.description}
          </p>
        </Link>
      ))}
    </nav>
  );
}
