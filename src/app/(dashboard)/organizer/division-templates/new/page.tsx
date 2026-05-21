import Link from "next/link";
import { DivisionTemplateEditor } from "@/components/domain/division-templates/DivisionTemplateEditor";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewDivisionTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ organizerId?: string }>;
}) {
  const actor = await requireActor();
  const { organizerId: organizerIdParam } = await searchParams;
  const organizerFilter = organizerIdParam?.trim() || undefined;
  const isAdmin = actor.role === "admin";

  if (isAdmin && !organizerFilter) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted-foreground text-sm">
          관리자는 템플릿 목록에서 주최자 ID(
          <code>?organizerId=</code>)를 지정한 뒤 새 체급표를 만들 수 있습니다.
        </p>
        <Link
          href="/organizer/division-templates"
          className={cn(buttonVariants({ variant: "link" }), "mt-4 px-0")}
        >
          ← 목록으로
        </Link>
      </div>
    );
  }

  const backHref = organizerFilter
    ? `/organizer/division-templates?organizerId=${encodeURIComponent(organizerFilter)}`
    : "/organizer/division-templates";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-2">
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          ← 체급표 목록
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          새 체급표 템플릿
        </h1>
      </div>
      <DivisionTemplateEditor
        mode="create"
        organizerIdForAdmin={organizerFilter}
      />
    </div>
  );
}
