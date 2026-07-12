import Link from "next/link";
import { ApplicationFormTemplateEditor } from "@/components/domain/application-form-templates/ApplicationFormTemplateEditor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewApplicationFormTemplatePage() {
  await requireActor();

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <Link
          href="/admin/application-form-templates"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          ← 템플릿 목록
        </Link>
        <AdminPageHeader title="신청서 템플릿 생성" />
        <ApplicationFormTemplateEditor mode="create" />
      </div>
    </div>
  );
}
