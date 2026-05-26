import Link from "next/link";
import { notFound } from "next/navigation";
import { DivisionTemplateEditor } from "@/components/domain/division-templates/DivisionTemplateEditor";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { divisionTemplateService } from "@/lib/services/division-template.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DivisionTemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const actor = await requireActor();
  const { templateId } = await params;

  let template;
  try {
    template = await divisionTemplateService.getTemplateById(actor, templateId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    throw e;
  }

  const backHref =
    actor.role === "admin"
      ? `/organizer/division-templates?organizerId=${encodeURIComponent(template.organizerId)}`
      : "/organizer/division-templates";

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,80rem)] flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          ← 체급표 목록
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {template.title}
        </h1>
        {actor.role === "admin" ? (
          <p className="text-muted-foreground text-xs">
            주최자: {template.organizerName}
          </p>
        ) : null}
      </div>
      <DivisionTemplateEditor mode="edit" initial={template} />
    </div>
  );
}
