import { NextResponse } from "next/server";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { judgeScoreSheetService } from "@/lib/services/judge-score-sheet.service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const actor = await requireActorFromMutation();
    const { eventId } = await params;
    await requireOrganizerForEvent(actor, eventId);

    const meta = await judgeScoreSheetService.getMeta(actor, eventId);
    return NextResponse.json(meta, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.reason === "UNAUTHORIZED" ? 401 : 403 },
      );
    }
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[judge-score-sheet-meta]", e);
    return NextResponse.json(
      { error: "경기 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
