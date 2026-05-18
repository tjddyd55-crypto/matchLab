import Link from "next/link";
import { DivisionTemplateForm } from "@/components/domain/division-templates/DivisionTemplateForm";
import { DivisionTemplateList } from "@/components/domain/division-templates/DivisionTemplateList";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { divisionTemplateService } from "@/lib/services/division-template.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerDivisionTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ organizerId?: string }>;
}) {
  const actor = await requireActor();
  const { organizerId: organizerIdParam } = await searchParams;

  const canLoadTemplates =
    actor.role !== "admin" || Boolean(organizerIdParam?.trim());

  const templates = canLoadTemplates
    ? await divisionTemplateService.listTemplatesDetailed(actor, organizerIdParam)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 md:px-6">
      {actor.role === "admin" && !organizerIdParam ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          관리자 계정은 주최자별 템플릿을 보려면 URL에{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            ?organizerId=(주최자 ID)
          </code>
          를 붙여 주세요.
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Link
          href="/organizer/events"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          ← 대회 목록
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          체급표 템플릿
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          자주 쓰는 부문 조합을 저장해 두었다가 대회 관리 화면에서 한 번에{" "}
          <strong>EventDivision</strong>으로 옮길 수 있습니다. 템플릿은 신청
          데이터가 아니라 생성 도구입니다.
        </p>
      </div>

      {canLoadTemplates ? (
        <>
          <DivisionTemplateList templates={templates} />
          <DivisionTemplateForm
            organizerIdForAdmin={organizerIdParam?.trim()}
          />
        </>
      ) : null}
    </div>
  );
}
