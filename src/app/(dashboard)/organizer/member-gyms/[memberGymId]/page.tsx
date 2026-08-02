import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { MemberGymAccountSection } from "@/components/domain/member-gyms/MemberGymAccountSection";
import { MemberGymDisconnectButton } from "@/components/domain/member-gyms/MemberGymDisconnectButton";
import { MemberGymFightersReadonlySection } from "@/components/domain/member-gyms/MemberGymFightersReadonlySection";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AssociationMemberGymStatus } from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { formatPhoneDisplay } from "@/lib/phone";
import { gymOwnerAccountService } from "@/lib/services/gym-owner-account.service";
import { memberGymService } from "@/lib/services/member-gym.service";
import { MEMBER_GYM_STATUS_LABEL } from "@/lib/ui-labels/member-gym";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MemberGymDetailPage({
  params,
}: {
  params: Promise<{ memberGymId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { memberGymId } = await params;

  let row;
  try {
    row = await memberGymService.getMemberGym(actor, memberGymId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const account = gymOwnerAccountService.describeOwnerAccount(row);
  const fighters = row.gym.fighters.filter(
    (f) => f /* currentGymId already gym SoT via relation */,
  );

  return (
    <>
      <OrganizerDashboardPageHeader
        title={row.gym.name}
        description={`회원사 코드 ${row.memberCode} · Gym.id ${row.gymId}`}
      >
        <Link
          href="/organizer/member-gyms"
          className="text-sm text-matchon-primary underline"
        >
          목록
        </Link>
      </OrganizerDashboardPageHeader>
      <MemberGymSubNav />
      <div className="mt-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4 text-sm">
            <h2 className="font-bold">기본정보</h2>
            <p>체육관명: {row.gym.name}</p>
            <p>전화: {formatPhoneDisplay(row.gym.phone, "-")}</p>
            <p>주소: {row.gym.address ?? "-"}</p>
            <p>소속 선수(전체): {row.gym._count.fighters}</p>
          </section>
          <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4 text-sm">
            <h2 className="font-bold">협회 회원 관계</h2>
            <p>상태: {MEMBER_GYM_STATUS_LABEL[row.status]}</p>
            <p>가입일: {format(row.joinedAt, "yyyy-MM-dd")}</p>
            <p>
              승인일:{" "}
              {row.approvedAt ? format(row.approvedAt, "yyyy-MM-dd") : "-"}
            </p>
            <p>내부 메모: {row.internalNote ?? "-"}</p>
            {row.applicationId ? (
              <p>
                <Link
                  href={`/organizer/member-gyms/applications/${row.applicationId}`}
                  className="text-matchon-primary underline"
                >
                  제출 서류·가입 신청 원본
                </Link>
              </p>
            ) : null}
            {row.status !== AssociationMemberGymStatus.withdrawn ? (
              <div className="pt-2">
                <MemberGymDisconnectButton
                  memberGymId={row.id}
                  gymName={row.gym.name}
                />
              </div>
            ) : null}
          </section>
        </div>

        <MemberGymAccountSection
          memberGymId={row.id}
          gymName={row.gym.name}
          account={account}
        />

        <MemberGymFightersReadonlySection
          memberGymId={row.id}
          fighters={fighters}
        />
      </div>
    </>
  );
}
