import Link from "next/link";
import { AdminCreateMemberSportTemplateForm } from "@/components/domain/admin/AdminCreateMemberSportTemplateForm";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/button";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function AdminNewMemberSportTemplatePage() {
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
          title="새 종목 템플릿"
          description="빈 템플릿을 만든 뒤 필드를 추가합니다. 체육관 연결은 별도로 진행합니다."
        />
        <div className={adminContentCardClass}>
          <AdminCreateMemberSportTemplateForm />
        </div>
      </div>
    </div>
  );
}
