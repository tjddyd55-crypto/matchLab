import type { Metadata } from "next";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { weighInSheetService } from "@/lib/services/weigh-in-sheet.service";
import {
  WeighInSheetDocumentView,
  WeighInSheetToolbar,
} from "@/components/domain/weigh-in/WeighInSheetDocument";
import "@/components/domain/weigh-in/weigh-in-sheet-print.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  try {
    const actor = await requireActor();
    await requireOrganizerForEventPage(actor, eventId);
    const doc = await weighInSheetService.getOrganizerWeighInSheetDocument(
      actor,
      eventId,
    );
    return { title: doc.documentTitle };
  } catch {
    return { title: "계체 기록지" };
  }
}

export default async function OrganizerWeighInSheetPrintPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  const doc = await weighInSheetService.getOrganizerWeighInSheetDocument(
    actor,
    eventId,
  );

  return (
    <div className="weigh-in-sheet-page">
      <WeighInSheetToolbar
        eventId={eventId}
        documentTitle={doc.documentTitle}
      />
      <WeighInSheetDocumentView doc={doc} />
    </div>
  );
}
