import Link from "next/link";
import { DivisionTemplateList } from "@/components/domain/division-templates/DivisionTemplateList";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
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
  const organizerFilter = organizerIdParam?.trim() || undefined;

  let templates: Awaited<
    ReturnType<typeof divisionTemplateService.listTemplates>
  > = [];
  let loadError: string | null = null;

  try {
    templates = await divisionTemplateService.listTemplates(
      actor,
      organizerFilter,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "FORBIDDEN") {
      loadError = e.message;
    } else {
      throw e;
    }
  }

  const isAdmin = actor.role === "admin";
  const canCreateTemplate = !isAdmin || Boolean(organizerFilter);
  const newHref = organizerFilter
    ? `/organizer/division-templates/new?organizerId=${encodeURIComponent(organizerFilter)}`
    : "/organizer/division-templates/new";

  return (
    <>
      {isAdmin ? (
        <p className="text-muted-foreground rounded-md border bg-muted/30 px-3 py-2 text-sm">
          관리자는 전체 템플릿을 볼 수 있습니다. 특정 주최자만 보려면 URL에{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            ?organizerId=(주최자 ID)
          </code>
          를 붙이세요. 새 템플릿 저장은 주최자 ID가 지정된 경우에만 가능합니다.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
            체급표는 대회 경기구분을 빠르게 생성하기 위한 템플릿입니다. 저장한
            체급표는 대회 상세에서 불러와 EventDivision으로 생성할 수 있습니다.
          </p>
        </div>
        {canCreateTemplate && !loadError ? (
          <Link href={newHref} className={buttonVariants({ size: "sm" })}>
            새 체급표
          </Link>
        ) : null}
      </div>

      {loadError ? (
        <EmptyState
          title="템플릿을 불러올 수 없습니다"
          description={loadError}
        />
      ) : templates.length === 0 ? (
        <EmptyState
          title="등록된 체급표 템플릿이 없습니다"
          description={
            canCreateTemplate
              ? "「새 체급표」에서 무에타이·킥복싱·복싱 예시를 불러와 수정할 수 있습니다."
              : "관리자는 주최자 ID를 지정한 뒤 템플릿을 추가할 수 있습니다."
          }
        />
      ) : (
        <DivisionTemplateList templates={templates} showOrganizer={isAdmin} />
      )}
    </>
  );
}
