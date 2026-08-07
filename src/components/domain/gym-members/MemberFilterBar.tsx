import Link from "next/link";
import {
  matchonFilterPillActiveClass,
  matchonFilterPillBaseClass,
  matchonFilterPillInactiveClass,
} from "@/lib/ui/matchon-shell-ui";
import { matchonScrollablePillsClass } from "@/lib/ui/matchon-layout";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type MemberListQuery = {
  q?: string;
  status?: string;
  fighter?: string;
  expiration?: string;
};

function hrefFor(
  base: MemberListQuery,
  patch: Partial<MemberListQuery>,
): string {
  const next = { ...base, ...patch };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.status) sp.set("status", next.status);
  if (next.fighter && next.fighter !== "all") sp.set("fighter", next.fighter);
  if (next.expiration && next.expiration !== "all") {
    sp.set("expiration", next.expiration);
  }
  const s = sp.toString();
  return s ? `/gym/members?${s}` : "/gym/members";
}

export function MemberFilterBar({
  query,
}: {
  query: MemberListQuery;
}) {
  const chips: {
    label: string;
    active: boolean;
    href: string;
  }[] = [
    {
      label: "전체",
      active: !query.status && (!query.expiration || query.expiration === "all") && (!query.fighter || query.fighter === "all"),
      href: hrefFor(query, {
        status: undefined,
        expiration: undefined,
        fighter: undefined,
        q: query.q,
      }),
    },
    {
      label: "이용 중",
      active: query.expiration === "active",
      href: hrefFor(query, {
        expiration: "active",
        status: undefined,
        fighter: query.fighter,
      }),
    },
    {
      label: "만료 예정",
      active: query.expiration === "expiring",
      href: hrefFor(query, {
        expiration: "expiring",
        status: undefined,
        fighter: query.fighter,
      }),
    },
    {
      label: "휴회",
      active: query.status === "paused",
      href: hrefFor(query, {
        status: "paused",
        expiration: undefined,
        fighter: query.fighter,
      }),
    },
    {
      label: "만료",
      active: query.expiration === "expired",
      href: hrefFor(query, {
        expiration: "expired",
        status: undefined,
        fighter: query.fighter,
      }),
    },
    {
      label: "선수",
      active: query.fighter === "fighter",
      href: hrefFor(query, {
        fighter: "fighter",
        status: query.status,
        expiration: query.expiration,
      }),
    },
  ];

  return (
    <div className="space-y-3" id="member-list">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {query.status ? (
          <input type="hidden" name="status" value={query.status} />
        ) : null}
        {query.fighter && query.fighter !== "all" ? (
          <input type="hidden" name="fighter" value={query.fighter} />
        ) : null}
        {query.expiration && query.expiration !== "all" ? (
          <input type="hidden" name="expiration" value={query.expiration} />
        ) : null}
        <label className="sr-only" htmlFor="member-search">
          이름·전화번호 검색
        </label>
        <input
          id="member-search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="이름·전화번호 검색"
          className={cn(matchonFieldInputClass, "sm:max-w-sm")}
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-matchon-primary px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
        >
          검색
        </button>
      </form>

      <div className={matchonScrollablePillsClass} role="list">
        {chips.map((chip) => (
          <Link
            key={chip.label}
            href={chip.href}
            role="listitem"
            className={cn(
              matchonFilterPillBaseClass,
              "min-h-11",
              chip.active
                ? matchonFilterPillActiveClass
                : matchonFilterPillInactiveClass,
            )}
            aria-current={chip.active ? "page" : undefined}
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
