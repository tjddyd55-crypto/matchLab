import type { Metadata } from "next";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { bracketPrintService } from "@/lib/services/bracket-print.service";
import {
  BracketPrintDocument,
  BracketPrintToolbar,
} from "@/components/domain/brackets/BracketPrintDocument";
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
    const doc = await bracketPrintService.getOrganizerBracketPrintDocument(
      actor,
      eventId,
    );
    return { title: doc.documentTitle };
  } catch {
    return { title: "시합 대진표" };
  }
}

/**
 * 시합 대진표 출력 전용 — DashboardShell 없이 최소 chrome.
 * 브라우저 인쇄 / PDF 저장 사용.
 */
export default async function OrganizerBracketPrintPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  const doc = await bracketPrintService.getOrganizerBracketPrintDocument(
    actor,
    eventId,
  );

  return (
    <div className="bracket-print-page">
      <BracketPrintToolbar
        eventId={eventId}
        documentTitle={doc.documentTitle}
      />
      <BracketPrintDocument doc={doc} />
    </div>
  );
}
