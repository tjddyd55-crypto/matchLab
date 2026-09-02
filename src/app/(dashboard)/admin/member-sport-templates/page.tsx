import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { memberSportTemplateAdminService } from "@/lib/services/member-sport-template-admin.service";
import { AdminMemberSportTemplateListTable } from "@/components/domain/admin/AdminMemberSportTemplateListTable";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/button";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminMemberSportTemplatesPage() {
  const actor = await requireActor();

  let templates: Awaited<
    ReturnType<typeof memberSportTemplateAdminService.listTemplates>
  > = [];
  let loadError: string | null = null;

  try {
    templates = await memberSportTemplateAdminService.listTemplates(actor);
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
            title="회원관리 템플릿"
            description="종목별 회원 프로필 필드 템플릿을 관리합니다. 체육관이 템플릿을 선택하면 회원 등록·수정 화면에 반영됩니다."
          />
          <Link
            href="/admin/member-sport-templates/new"
            className={cn(
              buttonVariants({ size: "field" }),
              "w-full shrink-0 sm:w-auto",
            )}
          >
            + 새 종목 템플릿
          </Link>
        </div>

        {loadError ? (
          <AdminListEmptyState
            title="템플릿을 불러올 수 없습니다"
            description={loadError}
          />
        ) : templates.length === 0 ? (
          <AdminListEmptyState
            title="등록된 회원관리 템플릿이 없습니다"
            description="새 종목 템플릿을 만들어 필드를 구성할 수 있습니다."
          />
        ) : (
          <div className={adminContentCardClass}>
            <AdminMemberSportTemplateListTable templates={templates} />
          </div>
        )}
      </div>
    </div>
  );
}
