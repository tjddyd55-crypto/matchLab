import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { IntakeFormEditorApp } from "@/components/domain/intake-forms/IntakeFormEditorApp";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { requireAssociationOrganizerPage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function OrganizerIntakeFormNewPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { duplicate } = await searchParams;

  return (
    <>
      <OrganizerDashboardPageHeader
        title="새 신청 폼"
        description="항목을 구성하고 저장 후 공개 링크를 공유하세요."
      />
      <div className="mt-6">
        <IntakeFormEditorApp
          mode="create"
          duplicateFromId={duplicate?.trim() || undefined}
        />
      </div>
    </>
  );
}
