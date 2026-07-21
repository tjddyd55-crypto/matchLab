import Link from "next/link";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { buttonVariants } from "@/components/ui/button";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { requireActor } from "@/lib/auth/actor";
import { FighterStatus } from "@/lib/enums";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { gymMemberService } from "@/lib/services/gym-member.service";
import {
  matchonCompactActionBarClass,
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
  matchonStatsGridClass,
} from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function GymProfileShell({ children }: { children: ReactNode }) {
  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>{children}</div>
    </div>
  );
}

export default async function GymHomePage() {
  const actor = await requireActor();

  if (!actor.gymId) {
    return (
      <GymProfileShell>
        <GymProfileMissingBanner />
      </GymProfileShell>
    );
  }

  const access = await resolveGymPortalAccess(actor).catch(() => null);
  const canCreate = access?.canCreateFighter ?? true;
  const canUpdate = access?.canUpdateFighter ?? true;

  const [memberSummary, totalFighters, activeFighters, recentMembers] =
    await Promise.all([
      gymMemberService.getSummary(actor).catch(() => null),
      prisma.fighter.count({ where: { currentGymId: actor.gymId } }),
      prisma.fighter.count({
        where: { currentGymId: actor.gymId, status: FighterStatus.active },
      }),
      prisma.gymMember
        .findMany({
          where: { gymId: actor.gymId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            memberNumber: true,
            fighter: { select: { id: true } },
          },
        })
        .catch(() => []),
    ]);

  const inactiveFighters = totalFighters - activeFighters;
  const hasMembers = (memberSummary?.total ?? 0) > 0;

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>회원사 홈</h1>
          <p className={matchonPageDescClass}>
            회원을 등록·관리하고, 필요 시 선수로 연결합니다. 체육관 정보는
            프로필에서 확인할 수 있습니다.
          </p>
        </div>

        {memberSummary ? (
          <div className={matchonStatsGridClass}>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>전체 회원</p>
              <p className={matchonStatValueClass}>{memberSummary.total}</p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>일반</p>
              <p className={matchonStatValueClass}>
                {memberSummary.withoutFighter}
              </p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>선수</p>
              <p className={matchonStatValueClass}>
                {memberSummary.withFighter}
              </p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>이용 중</p>
              <p className={matchonStatValueClass}>{memberSummary.inUse}</p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>만료 예정</p>
              <p className={matchonStatValueClass}>{memberSummary.expiring}</p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>이번 달 신규</p>
              <p className={matchonStatValueClass}>
                {memberSummary.newThisMonth}
              </p>
            </div>
          </div>
        ) : null}

        <div className={matchonStatsGridClass}>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>전체 선수</p>
            <p className={matchonStatValueClass}>{totalFighters}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>활동 선수</p>
            <p className={matchonStatValueClass}>{activeFighters}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>비활동 선수</p>
            <p className={matchonStatValueClass}>{inactiveFighters}</p>
          </div>
        </div>

        <div className={matchonCompactActionBarClass}>
          <Link
            href="/gym/members/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            회원 등록
          </Link>
          <Link
            href="/gym/members"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            회원 목록
          </Link>
          {canCreate ? (
            <Link
              href="/gym/fighters/new"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              선수 등록
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "pointer-events-none opacity-50",
              )}
              aria-disabled
            >
              선수 등록
            </span>
          )}
          <Link
            href="/gym/profile"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            체육관 정보
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className={matchonSectionTitleClass}>최근 등록 회원</h2>
          {!hasMembers || recentMembers.length === 0 ? (
            <MatchonEmptyState
              title="등록된 회원이 없습니다"
              description="회원을 등록하면 이용권·선수 연결을 함께 관리할 수 있습니다."
              action={
                <Link
                  href="/gym/members/new"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  회원 등록
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-matchon-border rounded-md border border-matchon-border bg-white">
              {recentMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-matchon-text-primary">
                      {m.name}
                    </p>
                    <p className="text-xs text-matchon-text-secondary">
                      {m.memberNumber} · {m.status}
                      {m.fighter ? " · 선수" : " · 일반"} ·{" "}
                      {format(m.createdAt, "yyyy-MM-dd")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/gym/members/${m.id}`}
                      className="text-xs font-semibold text-matchon-primary underline"
                    >
                      상세
                    </Link>
                    {m.fighter && canUpdate ? (
                      <Link
                        href={`/gym/fighters/${m.fighter.id}/edit`}
                        className="text-xs font-semibold text-matchon-text-secondary underline"
                      >
                        선수
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
