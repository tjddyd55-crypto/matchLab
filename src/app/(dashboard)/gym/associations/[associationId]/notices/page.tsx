import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { formatPublicDate } from "@/lib/date-display";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { associationNoticeService } from "@/lib/services/association-notice.service";
import { matchonPageContainerClass } from "@/lib/ui/matchon-layout";

export const dynamic = "force-dynamic";

export default async function GymAssociationNoticesPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "gym_staff", "admin"]);
  const { associationId } = await params;

  let data;
  try {
    data = await associationNoticeService.listForGymAssociation(
      actor,
      associationId,
    );
  } catch (e) {
    if (e instanceof AppError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) {
      notFound();
    }
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const { association, notices } = data;

  return (
    <div className={matchonPageContainerClass}>
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.04em] text-matchon-primary">
          협회
        </p>
        <h1 className="text-xl font-black text-matchon-text-primary md:text-2xl">
          {association.name}
        </h1>
        <p className="text-sm text-matchon-text-secondary">공지사항</p>
      </header>

      <div className="mt-4">
        {notices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-matchon-border bg-white px-6 py-12 text-center text-sm text-matchon-text-secondary">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-matchon-border bg-white">
            {notices.map((notice) => (
              <li
                key={notice.id}
                className="border-b border-matchon-border last:border-0"
              >
                <Link
                  href={`/gym/associations/${associationId}/notices/${notice.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-matchon-surface"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {notice.isPinned ? (
                        <Badge variant="secondary">고정</Badge>
                      ) : null}
                      <span
                        className="truncate font-semibold text-matchon-text-primary"
                        title={notice.title}
                      >
                        {notice.title}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-matchon-text-secondary">
                      {formatPublicDate(notice.publishedAt.toISOString())}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
