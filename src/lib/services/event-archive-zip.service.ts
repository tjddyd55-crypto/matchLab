import "server-only";

import archiver from "archiver";
import { PassThrough } from "node:stream";
import type { ActorContext } from "@/lib/auth/actor-context";
import { defaultApplicantExcelExportFieldKeys } from "@/lib/applications/applicant-excel-export-fields";
import { sanitizeApplicantExcelFilenamePart } from "@/lib/applications/applicant-excel-export-fields";
import { ymdFileStamp } from "@/lib/excel-export/filename";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { eventArchiveApplicantExcelService } from "@/lib/services/event-archive-applicant-excel.service";
import { eventArchiveService } from "@/lib/services/event-archive.service";

async function bufferFromStream(stream: PassThrough): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export const eventArchiveZipService = {
  async buildArchiveZip(
    actor: ActorContext,
    eventId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    await requireOrganizerForEvent(actor, eventId);
    const archive = await eventArchiveService.requireActiveArchive(actor, eventId);

    const { buffer: applicantsBuffer } =
      await eventArchiveApplicantExcelService.buildWorkbookFromArchive(
        actor,
        eventId,
        defaultApplicantExcelExportFieldKeys(),
      );

    const manifest = {
      eventId,
      eventName: archive.eventSnapshot.title,
      completedAt: archive.archivedAt,
      exportedAt: new Date().toISOString(),
      applicationCount: archive.applicantsSnapshot.totalCount,
      matchCount: archive.bracketSnapshot.totalMatchCount,
      confirmedResultCount: archive.resultsSnapshot.totalCount,
      archiveVersion: archive.version,
    };

    const pass = new PassThrough();
    const zip = archiver("zip", { zlib: { level: 9 } });
    zip.on("error", (err) => pass.destroy(err));
    zip.pipe(pass);

    zip.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
    zip.append(JSON.stringify(archive.eventSnapshot, null, 2), {
      name: "01_event_snapshot.json",
    });
    zip.append(applicantsBuffer, { name: "02_applications.xlsx" });
    zip.append(JSON.stringify(archive.bracketSnapshot, null, 2), {
      name: "04_brackets_snapshot.json",
    });
    zip.append(JSON.stringify(archive.resultsSnapshot, null, 2), {
      name: "05_match_results_snapshot.json",
    });

    await zip.finalize();
    const buffer = await bufferFromStream(pass);

    const titlePart = sanitizeApplicantExcelFilenamePart(
      archive.eventSnapshot.title || "대회",
    );
    const filename = `MATCHON_${titlePart}_${ymdFileStamp()}_archive.zip`;

    return { buffer, filename };
  },
};
