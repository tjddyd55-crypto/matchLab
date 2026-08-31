import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { formatPublicDateTime } from "@/lib/date-display";
import { AppError } from "@/lib/errors/app-error";
import { associationNoticeService } from "@/lib/services/association-notice.service";
import { matchonPageContainerClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymAssociationNoticeDetailPage({
  params,
}: {
  params: Promise<{ associationId: string; noticeId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "gym_staff", "admin"]);
  const { associationId, noticeId } = await params;

  let data;
  try {
    data = await associationNoticeService.getForGymAssociation(
      actor,
      associationId,
      noticeId,
    );
  } catch (e) {
    if (
      e instanceof AppError &&
      (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")
    ) {
      notFound();
    }
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const { association, notice } = data;

  return (
    <div className={matchonPageContainerClass}>
      <header className="space-y-2">
        <p className="text-xs font-bold text-matchon-primary">{association.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          {notice.isPinned ? <Badge variant="secondary">고정</Badge> : null}
          <h1 className="text-xl font-black text-matchon-text-primary md:text-2xl">
            {notice.title}
          </h1>
        </div>
        <p className="text-sm text-matchon-text-secondary">
          {formatPublicDateTime(notice.publishedAt.toISOString())}
        </p>
      </header>

      <article className="mt-6 rounded-xl border border-matchon-border bg-white p-5 md:p-6">
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-matchon-text-primary">
          {notice.content}
        </div>
      </article>

      <div className="mt-6">
        <Link
          href={`/gym/associations/${associationId}/notices`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          목록으로
        </Link>
      </div>
    </div>
  );
}
