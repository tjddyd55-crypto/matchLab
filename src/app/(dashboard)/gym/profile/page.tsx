import Link from "next/link";
import { GymProfileForm } from "@/components/domain/gym/GymProfileForm";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { gymAssociationConnectionService } from "@/lib/services/gym-association-connection.service";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GymProfilePage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "admin"]);
  const access = await resolveGymPortalAccess(actor);
  if (!access.canEnterPortal) {
    redirect("/gym");
  }

  const [gym, memberships] = await Promise.all([
    prisma.gym.findUnique({
      where: { id: access.gymId },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        status: true,
      },
    }),
    gymAssociationConnectionService.listMembershipsForGym(actor),
  ]);
  if (!gym) redirect("/gym");

  const activeAssociations = memberships.filter(
    (m) => m.statusLabel === "가입 완료",
  );
  const visibleAssociations = activeAssociations.slice(0, 3);
  const moreCount = Math.max(0, activeAssociations.length - 3);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <h1 className={matchonPageTitleClass}>체육관 정보</h1>
        <p className={matchonPageDescClass}>
          연락처·주소만 수정할 수 있습니다. 협회 가입은 별도 메뉴에서 여러
          협회를 동시에 관리할 수 있습니다.
        </p>
        <section className="space-y-2 rounded-xl border border-matchon-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-matchon-text-primary">
              가입 협회
            </h2>
            <Link
              href="/gym/associations"
              className="text-sm text-matchon-primary underline"
            >
              관리하기
            </Link>
          </div>
          {activeAssociations.length === 0 ? (
            <p className="text-sm text-matchon-text-secondary">
              가입한 협회가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {visibleAssociations.map((m) => (
                <li
                  key={m.id}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                >
                  {m.associationName}
                </li>
              ))}
              {moreCount > 0 ? (
                <li className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-700">
                  외 {moreCount}개
                </li>
              ) : null}
            </ul>
          )}
        </section>
        <GymProfileForm
          gym={gym}
          memberCode={access.memberGym?.memberCode ?? null}
          memberStatus={access.memberGym?.status ?? null}
          readOnly={false}
        />
      </div>
    </div>
  );
}
