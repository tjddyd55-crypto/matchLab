import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationDocumentService } from "@/lib/services/application-document.service";
import { PrintApplicationDocument } from "@/components/domain/applications/PrintApplicationDocument";

export const dynamic = "force-dynamic";

export default async function PrintApplicationDocumentPage({
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

  const snapshot = doc.documentSnapshotJson as Record<string, unknown> | null;
  const previewValues =
    snapshot &&
    typeof snapshot === "object" &&
    "previewValues" in snapshot &&
    typeof snapshot.previewValues === "object" &&
    snapshot.previewValues
      ? (snapshot.previewValues as Record<string, string>)
      : null;

  const formValues = doc.formValuesJson as Record<string, unknown>;
  const fallbackPreview =
    formValues &&
    typeof formValues === "object" &&
    "preview" in formValues &&
    typeof formValues.preview === "object" &&
    formValues.preview
      ? (formValues.preview as Record<string, string>)
      : {};

  return (
    <PrintApplicationDocument
      title={doc.template.title}
      fighterName={doc.fighter.name}
      gymName={doc.gym.name}
      eventTitle={doc.event.title}
      originalPdfFileName={doc.template.originalPdfFileName}
      previewValues={previewValues ?? fallbackPreview}
      hasGeneratedPdf={Boolean(doc.generatedPdfPath)}
    />
  );
}
