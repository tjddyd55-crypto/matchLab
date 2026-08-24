import type { Metadata } from "next";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { bracketPrintService } from "@/lib/services/bracket-print.service";
import type { BracketPrintMode } from "@/lib/brackets/bracket-print-format";
import {
  BracketPrintDocument,
  BracketPrintToolbar,
} from "@/components/domain/brackets/BracketPrintDocument";
import "@/components/domain/brackets/bracket-print.css";

export const dynamic = "force-dynamic";

function parsePrintMode(
  value: string | string[] | undefined | null,
): BracketPrintMode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "all-matches" ? "all-matches" : "court";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ mode?: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const sp = await searchParams;
  const mode = parsePrintMode(sp.mode);
  try {
    const actor = await requireActor();
    await requireOrganizerForEventPage(actor, eventId);
    const doc = await bracketPrintService.getOrganizerBracketPrintDocument(
      actor,
      eventId,
      { mode },
    );
    return { title: doc.documentTitle };
  } catch {
    return {
      title: mode === "all-matches" ? "전체 경기 편집" : "시합 대진표",
    };
  }
}

/**
 * 시합 대진표 출력 전용 — DashboardShell 없이 최소 chrome.
 * 브라우저 인쇄 / PDF 저장 사용.
 * ?mode=all-matches → 전체 경기 편집 출력(메모 포함)
 */
export default async function OrganizerBracketPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  const sp = await searchParams;
  const mode = parsePrintMode(sp.mode);
  await requireOrganizerForEventPage(actor, eventId);

  const doc = await bracketPrintService.getOrganizerBracketPrintDocument(
    actor,
    eventId,
    { mode },
  );

  return (
    <div className="bracket-print-page">
      <BracketPrintToolbar
        eventId={eventId}
        documentTitle={doc.documentTitle}
        printMode={mode}
      />
      <BracketPrintDocument doc={doc} />
    </div>
  );
}
