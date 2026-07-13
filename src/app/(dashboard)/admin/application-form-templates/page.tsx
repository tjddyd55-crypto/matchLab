import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import { ApplicationFormTemplateListTable } from "@/components/domain/application-form-templates/ApplicationFormTemplateListTable";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { adminContentCardClass, adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminApplicationFormTemplatesPage() {
  const actor = await requireActor();

  let templates: Awaited<
    ReturnType<typeof applicationFormTemplateService.listTemplates>
  > = [];
  let loadError: string | null = null;

  try {
    templates = await applicationFormTemplateService.listTemplates(actor);
  } catch (e) {
    if (e instanceof AppError) {
      loadError = e.message;
    } else {
      throw e;
    }
  }

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <AdminPageHeader
            title="신청서 템플릿"
            description="PDF 좌표형·자체 폼형 신청서 템플릿을 관리합니다. 대회 상세에서 템플릿을 연결하면 체육관 신청 흐름이 활성화됩니다."
          />
          <Link
            href="/admin/application-form-templates/new"
            className={cn(
              buttonVariants({ size: "field" }),
              "w-full shrink-0 sm:w-auto",
            )}
          >
            새 템플릿
          </Link>
        </div>

        {loadError ? (
          <AdminListEmptyState
            title="템플릿을 불러올 수 없습니다"
            description={loadError}
          />
        ) : templates.length === 0 ? (
          <AdminListEmptyState
            title="등록된 신청서 템플릿이 없습니다"
            description="새 템플릿을 만들어 대회에 연결할 수 있습니다."
          />
        ) : (
          <div className={adminContentCardClass}>
            <ApplicationFormTemplateListTable
              templates={templates}
              editPathPrefix="/admin/application-form-templates"
              canEditAll
            />
          </div>
        )}
      </div>
    </div>
  );
}
