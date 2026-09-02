import Link from "next/link";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { IntakeFormLinkCopyButton } from "@/components/domain/intake-forms/IntakeFormLinkCopyButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { formatPublicDate } from "@/lib/date-display";
import { INTAKE_FORM_STATUS_LABEL } from "@/lib/intake-form/ui-labels";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { intakeFormService } from "@/lib/services/intake-form.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerIntakeFormsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const forms = await intakeFormService.listForOrganizer(actor);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="신청 폼"
        description="심판교육·행사 등 독립 신청 폼을 만들고 링크로 공유합니다."
      >
        <Link href="/organizer/intake-forms/new" className={cn(buttonVariants())}>
          + 새 신청 폼
        </Link>
      </OrganizerDashboardPageHeader>
      <div className="mt-6 overflow-hidden rounded-xl border border-matchon-border bg-white">
        {forms.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-matchon-text-secondary">
            등록된 신청 폼이 없습니다.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-matchon-border bg-matchon-surface text-matchon-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">폼 이름</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">신청자</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">접수기간</th>
                <th className="px-4 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.id} className="border-b border-matchon-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/organizer/intake-forms/${form.id}`}
                      className="font-semibold text-matchon-primary hover:underline"
                    >
                      {form.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {INTAKE_FORM_STATUS_LABEL[form.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{form.submissionCount}명</td>
                  <td className="hidden px-4 py-3 text-matchon-text-secondary md:table-cell">
                    {form.startsAt
                      ? formatPublicDate(form.startsAt.toISOString())
                      : "—"}
                    {form.closesAt
                      ? ` ~ ${formatPublicDate(form.closesAt.toISOString())}`
                      : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <IntakeFormLinkCopyButton publicToken={form.publicToken} />
                      <Link
                        href={`/organizer/intake-forms/new?duplicate=${form.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        복제
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
