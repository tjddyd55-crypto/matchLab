import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";
import { prisma } from "@/lib/prisma";
import { formatFighterBirthDateDisplay } from "@/lib/fighter/birth-date";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MemberGymFighterReadonlyPage({
  params,
}: {
  params: Promise<{ memberGymId: string; fighterId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { memberGymId, fighterId } = await params;

  let member;
  try {
    member = await memberGymService.getMemberGym(actor, memberGymId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const fighter = await prisma.fighter.findFirst({
    where: {
      id: fighterId,
      currentGymId: member.gymId,
    },
    include: {
      currentGym: { select: { id: true, name: true } },
      applications: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          event: { select: { title: true } },
        },
      },
    },
  });
  if (!fighter) notFound();

  return (
    <>
      <OrganizerDashboardPageHeader
        title={fighter.name}
        description={`회원사 「${member.gym.name}」 소속 선수 · 읽기 전용`}
      >
        <Link
          href={`/organizer/member-gyms/${memberGymId}`}
          className="text-sm text-matchon-primary underline"
        >
          회원사 상세
        </Link>
      </OrganizerDashboardPageHeader>
      <MemberGymSubNav />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4 text-sm">
          <h2 className="font-bold">기본정보</h2>
          <p>이름: {fighter.name}</p>
          <p>성별: {fighter.gender}</p>
          <p>생년월일: {formatFighterBirthDateDisplay(fighter.birthDate)}</p>
          <p>연락처: {fighter.phone}</p>
          <p>
            신장/체중: {fighter.height ?? "-"} / {fighter.weight ?? "-"}
          </p>
          <p>상태: {fighter.status}</p>
          <p>소속: {fighter.currentGym?.name ?? "-"}</p>
          <p>
            전적: {fighter.recordWin}승 {fighter.recordLoss}패{" "}
            {fighter.recordDraw}무
          </p>
        </section>
        <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4 text-sm">
          <h2 className="font-bold">참가 기록</h2>
          <ul className="space-y-1">
            {fighter.applications.map((a) => (
              <li key={a.id}>
                {a.event.title} · {a.status} ·{" "}
                {format(a.createdAt, "yyyy-MM-dd")}
              </li>
            ))}
            {fighter.applications.length === 0 ? (
              <li className="text-matchon-text-secondary">참가 기록 없음</li>
            ) : null}
          </ul>
          <p className="pt-2 text-xs text-matchon-text-secondary">
            협회는 선수 등록·수정·삭제를 할 수 없습니다.
          </p>
        </section>
      </div>
    </>
  );
}
