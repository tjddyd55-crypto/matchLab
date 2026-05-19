import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationDocumentService } from "@/lib/services/application-document.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerApplicationDocumentPage({
  params,
}: {
  params: Promise<{ eventId: string; documentId: string }>;
}) {
  const actor = await requireActor();
  const { eventId, documentId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  let doc;
  try {
    doc = await applicationDocumentService.getDocumentForOrganizer(
      actor,
      eventId,
      documentId,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  const formValues = doc.formValuesJson as Record<string, unknown>;
  const preview =
    formValues &&
    typeof formValues === "object" &&
    "preview" in formValues &&
    typeof formValues.preview === "object" &&
    formValues.preview
      ? (formValues.preview as Record<string, string>)
      : {};

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6">
      <div>
        <Link
          href={`/organizer/events/${eventId}/application-batches/${doc.batchId ?? ""}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          ← 신청 묶음
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          신청서 문서
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {doc.fighter.name} · {doc.gym.name} · {doc.status}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/organizer/events/${eventId}/application-documents/${documentId}/print`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          target="_blank"
        >
          인쇄용 보기
        </Link>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">미리보기 값</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(preview).map(([key, value]) => (
            <div key={key}>
              <dt className="text-muted-foreground font-mono text-xs">{key}</dt>
              <dd>{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
