import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberGymApplicationReviewPanel } from "@/components/domain/member-gyms/MemberGymApplicationReviewPanel";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";
import {
  MEMBER_GYM_APPLICATION_STATUS_LABEL,
  resolveMemberGymApplicationSourceLabel,
} from "@/lib/ui-labels/member-gym";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MemberGymApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { applicationId } = await params;

  let app;
  let candidates;
  try {
    app = await memberGymService.getApplication(actor, applicationId);
    candidates = await memberGymService.searchGymCandidatesForApplication(
      actor,
      applicationId,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  return (
    <>
      <OrganizerDashboardPageHeader
        title={app.gymName}
        description={`가입 신청 상세 · ${MEMBER_GYM_APPLICATION_STATUS_LABEL[app.status]}`}
      >
        <Link
          href="/organizer/member-gyms/applications"
          className="text-sm text-matchon-primary underline"
        >
          목록
        </Link>
      </OrganizerDashboardPageHeader>
      <MemberGymSubNav />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4 text-sm">
          <h2 className="font-bold">신청 정보</h2>
          <p>
            접수 방식:{" "}
            <span className="rounded bg-matchon-surface px-2 py-0.5 text-xs">
              {resolveMemberGymApplicationSourceLabel(
                app.submissionSource,
                app.joinLinkId,
              )}
            </span>
          </p>
          {app.internalMemo ? <p>내부 메모: {app.internalMemo}</p> : null}
          {app.receivedAt ? (
            <p>접수일: {format(app.receivedAt, "yyyy-MM-dd")}</p>
          ) : null}
          <p>대표자: {app.ownerName}</p>
          {app.ownerNameEn ? <p>영문: {app.ownerNameEn}</p> : null}
          <p>연락처: {app.phone}</p>
          <p>이메일: {app.email}</p>
          <p>체육관 주소: {app.gymAddress}</p>
          {app.homeAddress ? <p>집 주소: {app.homeAddress}</p> : null}
          {app.qualifications ? <p>자격: {app.qualifications}</p> : null}
          <p>신청인: {app.signatureName}</p>
          <p>신청일: {format(app.submittedAt, "yyyy-MM-dd HH:mm")}</p>
          <p>
            동의: 개인정보 {app.privacyConsent ? "Y" : "N"} / 등록{" "}
            {app.registrationConsent ? "Y" : "N"} / SMS{" "}
            {app.smsConsent ? "Y" : "N"}
          </p>
        </section>
        <MemberGymApplicationReviewPanel
          applicationId={app.id}
          status={app.status}
          attachments={app.attachments}
          gymCandidates={candidates}
        />
      </div>
      <section className="mt-4 rounded-md border border-matchon-border bg-white p-4 text-sm">
        <h2 className="mb-2 font-bold">상태 이력</h2>
        <ul className="space-y-1">
          {app.reviews.map((r) => (
            <li key={r.id} className="text-matchon-text-secondary">
              {format(r.createdAt, "yyyy-MM-dd HH:mm")} ·{" "}
              {r.fromStatus
                ? MEMBER_GYM_APPLICATION_STATUS_LABEL[r.fromStatus]
                : "-"}{" "}
              → {MEMBER_GYM_APPLICATION_STATUS_LABEL[r.toStatus]}
              {r.note ? ` · ${r.note}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
