import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
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
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4 text-sm">
          <h2 className="font-bold">체육관(SoT: Gym)</h2>
          <p>이름: {row.gym.name}</p>
          <p>전화: {row.gym.phone ?? "-"}</p>
          <p>주소: {row.gym.address ?? "-"}</p>
          <p>소속 선수: {row.gym._count.fighters}</p>
        </section>
        <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4 text-sm">
          <h2 className="font-bold">협회 회원 관계</h2>
          <p>상태: {MEMBER_GYM_STATUS_LABEL[row.status]}</p>
          <p>가입일: {format(row.joinedAt, "yyyy-MM-dd")}</p>
          <p>
            승인일:{" "}
            {row.approvedAt ? format(row.approvedAt, "yyyy-MM-dd") : "-"}
          </p>
          <p>메모: {row.internalNote ?? "-"}</p>
          {row.applicationId ? (
            <p>
              <Link
                href={`/organizer/member-gyms/applications/${row.applicationId}`}
                className="text-matchon-primary underline"
              >
                가입 신청 원본 보기
              </Link>
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
