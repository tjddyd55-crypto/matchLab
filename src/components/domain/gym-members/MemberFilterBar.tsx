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
  joined?: string;
  groupId?: string;
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
  if (next.joined && next.joined !== "all") sp.set("joined", next.joined);
  if (next.groupId) sp.set("groupId", next.groupId);
  const s = sp.toString();
  return s ? `/gym/members?${s}` : "/gym/members";
}

function hasNoListChipFilter(query: MemberListQuery): boolean {
  return (
    !query.status &&
    (!query.expiration || query.expiration === "all") &&
    (!query.fighter || query.fighter === "all") &&
    (!query.joined || query.joined === "all") &&
    !query.groupId
  );
}

export function MemberFilterBar({
  query,
  groups = [],
  resultCountLabel,
}: {
  query: MemberListQuery;
  groups?: { id: string; name: string }[];
  /** Optional compact count shown beside search (replaces separate list title). */
  resultCountLabel?: string;
}) {
  const chips: {
    label: string;
    active: boolean;
    href: string;
  }[] = [
    {
      label: "전체",
      active: hasNoListChipFilter(query),
      href: hrefFor(query, {
        status: undefined,
        expiration: undefined,
        fighter: undefined,
        joined: undefined,
        groupId: undefined,
        q: query.q,
      }),
    },
    {
      label: "이용 중",
      active: query.expiration === "active",
      href: hrefFor(query, {
        expiration: "active",
        status: undefined,
        joined: undefined,
        fighter: query.fighter,
        groupId: query.groupId,
      }),
    },
    {
      label: "만료 예정",
      active: query.expiration === "expiring",
      href: hrefFor(query, {
        expiration: "expiring",
        status: undefined,
        joined: undefined,
        fighter: query.fighter,
        groupId: query.groupId,
      }),
    },
    {
      label: "휴회",
      active: query.status === "paused",
      href: hrefFor(query, {
        status: "paused",
        expiration: undefined,
        joined: undefined,
        fighter: query.fighter,
        groupId: query.groupId,
      }),
    },
    {
      label: "만료",
      active: query.expiration === "expired",
      href: hrefFor(query, {
        expiration: "expired",
        status: undefined,
        joined: undefined,
        fighter: query.fighter,
        groupId: query.groupId,
      }),
    },
    {
      label: "이번 달 신규",
      active: query.joined === "this-month",
      href: hrefFor(query, {
        joined: "this-month",
        status: undefined,
        expiration: undefined,
        fighter: query.fighter,
        groupId: query.groupId,
      }),
    },
    {
      label: "선수",
      active: query.fighter === "fighter",
      href: hrefFor(query, {
        fighter: "fighter",
        status: query.status,
        expiration: query.expiration,
        joined: query.joined,
        groupId: query.groupId,
      }),
    },
    ...groups.map((g) => ({
      label: g.name,
      active: query.groupId === g.id,
      href: hrefFor(query, {
        groupId: query.groupId === g.id ? undefined : g.id,
        status: query.status,
        expiration: query.expiration,
        joined: query.joined,
        fighter: query.fighter,
      }),
    })),
  ];

  return (
    <div className="space-y-1.5" id="member-list">
      <form
        method="get"
        className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
      >
        {query.status ? (
          <input type="hidden" name="status" value={query.status} />
        ) : null}
        {query.fighter && query.fighter !== "all" ? (
          <input type="hidden" name="fighter" value={query.fighter} />
        ) : null}
        {query.expiration && query.expiration !== "all" ? (
          <input type="hidden" name="expiration" value={query.expiration} />
        ) : null}
        {query.joined && query.joined !== "all" ? (
          <input type="hidden" name="joined" value={query.joined} />
        ) : null}
        {query.groupId ? (
          <input type="hidden" name="groupId" value={query.groupId} />
        ) : null}
        <label className="sr-only" htmlFor="member-search">
          이름·전화번호 검색
        </label>
        <input
          id="member-search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="이름·전화번호 검색"
          className={cn(matchonFieldInputClass, "min-h-8 sm:max-w-sm")}
        />
        <button
          type="submit"
          className="inline-flex min-h-8 items-center justify-center rounded-lg bg-matchon-primary px-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
        >
          검색
        </button>
        {resultCountLabel ? (
          <p className="text-[11px] font-medium text-matchon-text-secondary sm:ml-1">
            {resultCountLabel}
          </p>
        ) : null}
      </form>

      <div className={matchonScrollablePillsClass} role="list">
        {chips.map((chip) => (
          <Link
            key={`${chip.label}-${chip.href}`}
            href={chip.href}
            role="listitem"
            className={cn(
              matchonFilterPillBaseClass,
              "min-h-8 px-2 text-[12px]",
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
