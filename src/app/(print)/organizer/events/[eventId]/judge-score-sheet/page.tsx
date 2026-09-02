import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { parseJudgeScoreSheetJudgesParam } from "@/lib/judge-score-sheet/format";
import { judgeScoreSheetService } from "@/lib/services/judge-score-sheet.service";
import { JudgeScoreSheetDocumentView } from "@/components/domain/judge-score-sheet/JudgeScoreSheetDocument";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "@/components/domain/judge-score-sheet/judge-score-sheet-print.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ judges?: string; courtId?: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const sp = await searchParams;
  try {
    const actor = await requireActor();
    await requireOrganizerForEventPage(actor, eventId);
    const doc = await judgeScoreSheetService.loadDocument(actor, eventId, {
      judgesParam: sp.judges,
      courtId: sp.courtId ?? null,
    });
    return { title: doc.documentTitle };
  } catch {
    return { title: "심판 채점표" };
  }
}

export default async function OrganizerJudgeScoreSheetPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ judges?: string; courtId?: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  const sp = await searchParams;
  await requireOrganizerForEventPage(actor, eventId);

  const judges = parseJudgeScoreSheetJudgesParam(sp.judges);
  const doc = await judgeScoreSheetService.loadDocument(actor, eventId, {
    judges,
    courtId: sp.courtId ?? null,
  });

  return (
    <div className="judge-score-sheet-page">
      <div className="judge-score-sheet-toolbar no-print">
        <Link
          href={`/organizer/events/${eventId}/brackets`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← 대진표
        </Link>
        <span className="text-sm text-matchon-text-secondary">
          {doc.documentTitle} · {doc.pageCount}페이지
        </span>
      </div>
      <JudgeScoreSheetDocumentView doc={doc} />
    </div>
  );
}
