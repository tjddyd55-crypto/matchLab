import { NextResponse } from "next/server";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { eventArchiveZipService } from "@/lib/services/event-archive-zip.service";

export const runtime = "nodejs";
export const maxDuration = 120;

function buildContentDisposition(filename: string): string {
  const ascii =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim() || "MATCHON_archive.zip";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const actor = await requireActorFromMutation();
    const { eventId } = await params;
    const { buffer, filename } = await eventArchiveZipService.buildArchiveZip(
      actor,
      eventId,
      { cookieHeader: request.headers.get("cookie") },
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
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
    const message =
      e instanceof Error ? e.message : "ZIP 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
