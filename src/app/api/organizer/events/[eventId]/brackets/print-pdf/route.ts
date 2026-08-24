import { NextResponse } from "next/server";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { generateBracketPrintPdfBuffer } from "@/lib/brackets/bracket-print-pdf";
import { buildBracketPrintDocumentTitle } from "@/lib/brackets/bracket-print-format";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;

function buildContentDisposition(filename: string): string {
  const ascii =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim() || "MATCHON_bracket.pdf";
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

    const pdf = await generateBracketPrintPdfBuffer({
      eventId,
      cookieHeader: request.headers.get("cookie"),
    });

    const filename = `${buildBracketPrintDocumentTitle(event.title)}.pdf`;

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
    console.error("[brackets/print-pdf]", e);
    return NextResponse.json(
      {
        error:
          "PDF 생성에 실패했습니다. 인쇄 버튼으로 브라우저 PDF 저장을 이용해 주세요.",
      },
      { status: 500 },
    );
  }
}
