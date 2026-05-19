import Link from "next/link";
import { ApplicationFormTemplateForm } from "@/components/domain/application-form-templates/ApplicationFormTemplateForm";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewApplicationFormTemplatePage() {
  await requireActor();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
      <Link
        href="/admin/application-form-templates"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
      >
        ← 템플릿 목록
      </Link>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        신청서 템플릿 생성
      </h1>
      <ApplicationFormTemplateForm mode="create" />
    </div>
  );
}
