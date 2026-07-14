import Link from "next/link";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { buttonVariants } from "@/components/ui/button";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { requireActor } from "@/lib/auth/actor";
import { FighterStatus } from "@/lib/enums";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
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

  const [total, active, recent] = await Promise.all([
    prisma.fighter.count({ where: { currentGymId: actor.gymId } }),
    prisma.fighter.count({
      where: { currentGymId: actor.gymId, status: FighterStatus.active },
    }),
    prisma.fighter.findMany({
      where: { currentGymId: actor.gymId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        gender: true,
      },
    }),
  ]);
  const inactive = total - active;

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>회원사 홈</h1>
          <p className={matchonPageDescClass}>
            소속 선수를 등록·관리합니다. 체육관 정보는 프로필에서 확인할 수
            있습니다.
          </p>
        </div>

        <div className={matchonStatsGridClass}>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>전체 선수</p>
            <p className={matchonStatValueClass}>{total}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>활동 선수</p>
            <p className={matchonStatValueClass}>{active}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>비활동 선수</p>
            <p className={matchonStatValueClass}>{inactive}</p>
          </div>
        </div>

        <div className={matchonCompactActionBarClass}>
          {canCreate ? (
            <Link
              href="/gym/fighters/new"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              선수 등록
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ size: "sm" }),
                "pointer-events-none opacity-50",
              )}
              aria-disabled
            >
              선수 등록
            </span>
          )}
          <Link
            href="/gym/fighters"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            선수 목록 보기
          </Link>
          <Link
            href="/gym/profile"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            체육관 정보
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className={matchonSectionTitleClass}>최근 등록 선수</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-matchon-text-secondary">
              등록된 선수가 없습니다. 선수 등록으로 시작해 보세요.
            </p>
          ) : (
            <ul className="divide-y divide-matchon-border rounded-md border border-matchon-border bg-white">
              {recent.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-matchon-text-primary">
                      {f.name}
                    </p>
                    <p className="text-xs text-matchon-text-secondary">
                      {f.gender} · {f.status} ·{" "}
                      {format(f.createdAt, "yyyy-MM-dd")}
                    </p>
                  </div>
                  {canUpdate ? (
                    <Link
                      href={`/gym/fighters/${f.id}/edit`}
                      className="text-xs font-semibold text-matchon-primary underline"
                    >
                      수정
                    </Link>
                  ) : (
                    <span className="text-xs text-matchon-text-secondary">
                      조회만
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
