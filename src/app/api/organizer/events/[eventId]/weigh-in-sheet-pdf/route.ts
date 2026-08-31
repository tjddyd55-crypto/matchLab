import { NextResponse } from "next/server";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { generateWeighInSheetPdfBuffer } from "@/lib/brackets/bracket-print-pdf";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { weighInSheetService } from "@/lib/services/weigh-in-sheet.service";

export const runtime = "nodejs";
export const maxDuration = 120;

function buildContentDisposition(filename: string): string {
  const ascii =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim() || "MATCHON_weigh_in_sheet.pdf";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const actor = await requireActorFromMutation();
    const { eventId } = await params;
    await requireOrganizerForEvent(actor, eventId);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    });
    if (!event) {
      return NextResponse.json(
        { error: "대회를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const pdf = await generateWeighInSheetPdfBuffer({
      eventId,
      cookieHeader: request.headers.get("cookie"),
    });

    const filename = weighInSheetService.buildDownloadFilename(event.title);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.reason === "UNAUTHORIZED" ? 401 : 403 },
      );
    }
    console.error("[weigh-in-sheet-pdf]", e);
    return NextResponse.json(
      {
        error:
          "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
