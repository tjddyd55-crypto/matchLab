import type { Metadata } from "next";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { bracketPrintService } from "@/lib/services/bracket-print.service";
import {
  UnmatchedPrintDocument,
  UnmatchedPrintToolbar,
} from "@/components/domain/brackets/UnmatchedPrintDocument";
import "@/components/domain/brackets/bracket-print.css";

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
    const doc = await bracketPrintService.getOrganizerUnmatchedPrintDocument(
      actor,
      eventId,
    );
    return { title: doc.documentTitle };
  } catch {
    return { title: "미매칭 선수 명단" };
  }
}

export default async function OrganizerUnmatchedPrintPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  const doc = await bracketPrintService.getOrganizerUnmatchedPrintDocument(
    actor,
    eventId,
  );

  return (
    <div className="bracket-print-page">
      <UnmatchedPrintToolbar
        eventId={eventId}
        documentTitle={doc.documentTitle}
      />
      <UnmatchedPrintDocument doc={doc} />
    </div>
  );
}
