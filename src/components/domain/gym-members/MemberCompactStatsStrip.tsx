import Link from "next/link";
import { GymMemberStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";

export type MemberCompactStats = {
  total: number;
  inUse: number;
  expiring: number;
  paused: number;
  newThisMonth: number;
};

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v !== "all" && v !== "") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function filterHref(patch: Record<string, string | undefined>): string {
  return `/gym/members${buildQuery(patch)}`;
}

export function MemberCompactStatsStrip({
  summary,
  active,
}: {
  summary: MemberCompactStats;
  active?: {
    expiration?: string;
    status?: string;
    joined?: string;
  };
}) {
  const items: {
    key: string;
    label: string;
    value: number;
    href: string;
    selected: boolean;
  }[] = [
    {
      key: "total",
      label: "전체",
      value: summary.total,
      href: filterHref({}),
      selected:
        !active?.expiration &&
        !active?.status &&
        !active?.joined,
    },
    {
      key: "inUse",
      label: "이용 중",
      value: summary.inUse,
      href: filterHref({ expiration: "active" }),
      selected: active?.expiration === "active",
    },
    {
      key: "expiring",
      label: "만료 예정",
      value: summary.expiring,
      href: filterHref({ expiration: "expiring" }),
      selected: active?.expiration === "expiring",
    },
    {
      key: "paused",
      label: "휴회",
      value: summary.paused,
      href: filterHref({ status: GymMemberStatus.paused }),
      selected: active?.status === GymMemberStatus.paused,
    },
    {
      key: "new",
      label: "신규",
      value: summary.newThisMonth,
      href: filterHref({ joined: "this-month" }),
      selected: active?.joined === "this-month",
    },
  ];

  return (
    <div
      className="flex min-h-10 flex-wrap items-center gap-x-1 gap-y-1 rounded-md border border-matchon-border bg-white px-2.5 py-1.5 text-[12px]"
      role="navigation"
      aria-label="회원 현황 바로가기"
    >
      {items.map((item, index) => (
        <span key={item.key} className="inline-flex items-center">
          {index > 0 ? (
            <span
              aria-hidden
              className="mx-1.5 text-matchon-border select-none"
            >
              |
            </span>
          ) : null}
          <Link
            href={item.href}
            className={cn(
              "inline-flex items-baseline gap-1 rounded px-1 py-0.5 transition-colors",
              item.selected
                ? "bg-matchon-primary-light font-semibold text-matchon-primary"
                : "text-matchon-text-secondary hover:text-matchon-primary",
            )}
          >
            <span>{item.label}</span>
            <span
              className={cn(
                "tabular-nums",
                item.selected
                  ? "text-matchon-primary"
                  : "font-semibold text-matchon-text-primary",
              )}
            >
              {item.value}
            </span>
          </Link>
        </span>
      ))}
    </div>
  );
}
