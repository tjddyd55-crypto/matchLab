import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationBatchService } from "@/lib/services/application-batch.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerApplicationBatchDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; batchId: string }>;
}) {
  const actor = await requireActor();
  const { eventId, batchId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  let batch;
  try {
    batch = await applicationBatchService.getBatchDetailForOrganizer(
      actor,
      eventId,
      batchId,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  return (
    <>
      <div>
        <Link
          href={`/organizer/events/${eventId}/application-batches`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          ← 신청 묶음 목록
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          신청 묶음 상세
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {batch.gym.name} · {batch.template.title}
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">접수번호</dt>
          <dd className="font-mono">{batch.documentNo ?? "—"}</dd>
        </div>
        <DlItem label="상태" value={batch.status} />
        <DlItem
          label="제출일"
          value={
            batch.submittedAt
              ? new Date(batch.submittedAt).toLocaleString("ko-KR")
              : "—"
          }
        />
        <DlItem label="선수 수" value={String(batch.documents.length)} />
        <DlItem
          label="참가비 합계"
          value={
            batch.organizerTotalFee != null
              ? `${batch.organizerTotalFee.toLocaleString("ko-KR")}원`
              : "—"
          }
        />
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">선수별 신청서</h2>
        <ul className="divide-y rounded-lg border">
          {batch.documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{doc.fighter.name}</p>
                <p className="text-muted-foreground text-xs">{doc.status}</p>
              </div>
              <Link
                href={`/organizer/events/${eventId}/application-documents/${doc.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                문서 보기
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function DlItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
