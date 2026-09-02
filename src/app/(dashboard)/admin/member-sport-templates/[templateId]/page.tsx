import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { memberSportTemplateAdminService } from "@/lib/services/member-sport-template-admin.service";
import { memberSportTemplateFieldRepository } from "@/lib/repositories/gym-member-profile.repository";
import { AdminMemberSportTemplateBuilder } from "@/components/domain/admin/AdminMemberSportTemplateBuilder";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/button";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminMemberSportTemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const actor = await requireActor();

  let template: Awaited<
    ReturnType<typeof memberSportTemplateAdminService.getTemplate>
  >;
  try {
    template = await memberSportTemplateAdminService.getTemplate(
      actor,
      templateId,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const valueUsage: Record<string, number> = {};
  for (const field of template.fields) {
    if (!field.id) continue;
    valueUsage[field.stableKey] =
      await memberSportTemplateFieldRepository.countValues(field.id);
  }

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <Link
          href="/admin/member-sport-templates"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit",
          )}
        >
          ← 회원관리 템플릿
        </Link>
        <AdminPageHeader
          title={template.name}
          description={`${template.code} · ${template.sportType}`}
        />
        <div className={adminContentCardClass}>
          <AdminMemberSportTemplateBuilder
            templateId={template.id}
            code={template.code}
            initialName={template.name}
            initialSportType={template.sportType}
            initialActive={template.active}
            initialFields={template.fields}
            gymCount={template.gymCount}
            valueUsage={valueUsage}
          />
        </div>
      </div>
    </div>
  );
}
