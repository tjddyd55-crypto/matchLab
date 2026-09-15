import "server-only";

import archiver from "archiver";
import { PassThrough } from "node:stream";
import type { ActorContext } from "@/lib/auth/actor-context";
import { defaultApplicantExcelExportFieldKeys } from "@/lib/applications/applicant-excel-export-fields";
import { sanitizeApplicantExcelFilenamePart } from "@/lib/applications/applicant-excel-export-fields";
import {
  buildArchivePackageManifest,
  buildArchiveReadmeText,
  encodeArchiveReadmeUtf8,
} from "@/lib/event-archive/archive-package-manifest";
import { ymdFileStamp } from "@/lib/excel-export/filename";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { eventArchiveApplicantExcelService } from "@/lib/services/event-archive-applicant-excel.service";
import { eventArchivePackageExportService } from "@/lib/services/event-archive-package-export.service";
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
    options?: { cookieHeader?: string | null },
  ): Promise<{ buffer: Buffer; filename: string }> {
    await requireOrganizerForEvent(actor, eventId);
    const archive = await eventArchiveService.requireActiveArchive(actor, eventId);
    const cookieHeader = options?.cookieHeader ?? null;
    const exportedAt = new Date().toISOString();

    const [
      { buffer: applicantsBuffer },
      weighInXlsx,
      resultsXlsx,
      judgeScoresXlsx,
      judgeScoreCount,
      weighInCount,
    ] = await Promise.all([
      eventArchiveApplicantExcelService.buildWorkbookFromArchive(
        actor,
        eventId,
        defaultApplicantExcelExportFieldKeys(),
      ),
      eventArchivePackageExportService.buildWeighInWorkbook(actor, eventId),
      eventArchivePackageExportService.buildResultsWorkbookFromSnapshot(
        archive.bracketSnapshot,
        archive.resultsSnapshot,
      ),
      eventArchivePackageExportService.buildJudgeScoresWorkbook(actor, eventId),
      eventArchivePackageExportService.countJudgeScores(eventId),
      eventArchivePackageExportService.countWeighInRecords(eventId),
    ]);

    let bracketPdf: Buffer | null = null;
    let weighInPdf: Buffer | null = null;
    try {
      bracketPdf = await eventArchivePackageExportService.buildBracketPdf(
        actor,
        eventId,
        cookieHeader,
      );
    } catch {
      bracketPdf = null;
    }
    try {
      weighInPdf = await eventArchivePackageExportService.buildWeighInPdf(
        actor,
        eventId,
        cookieHeader,
      );
    } catch {
      weighInPdf = null;
    }

    const manifest = buildArchivePackageManifest({
      eventId,
      eventName: archive.eventSnapshot.title,
      completedAt: archive.archivedAt,
      exportedAt,
      archiveVersion: archive.version,
      applicationCount: archive.applicantsSnapshot.totalCount,
      matchCount: archive.bracketSnapshot.totalMatchCount,
      confirmedResultCount: archive.resultsSnapshot.totalCount,
      judgeScoreCount,
      weighInCount,
      includeWeighInPdf: weighInPdf != null,
      includeBracketPdf: bracketPdf != null,
    });

    const readmeText = buildArchiveReadmeText({
      eventName: manifest.eventName,
      completedAt: manifest.completedAt,
      exportedAt: manifest.exportedAt,
      includedFiles: manifest.files,
    });
    const readmeBuffer = encodeArchiveReadmeUtf8(readmeText);

    const pass = new PassThrough();
    const zip = archiver("zip", { zlib: { level: 9 } });
    zip.on("error", (err) => pass.destroy(err));
    zip.pipe(pass);

    zip.append(readmeBuffer, { name: "README.txt" });
    zip.append(JSON.stringify(archive.eventSnapshot, null, 2), {
      name: "01_event_info.json",
    });
    zip.append(applicantsBuffer, { name: "02_applications.xlsx" });
    zip.append(weighInXlsx, { name: "03_weigh_in.xlsx" });
    if (weighInPdf) {
      zip.append(weighInPdf, { name: "03_weigh_in.pdf" });
    }
    if (bracketPdf) {
      zip.append(bracketPdf, { name: "04_brackets.pdf" });
    }
    zip.append(JSON.stringify(archive.bracketSnapshot, null, 2), {
      name: "04_brackets_snapshot.json",
    });
    zip.append(resultsXlsx, { name: "05_match_results.xlsx" });
    zip.append(JSON.stringify(archive.resultsSnapshot, null, 2), {
      name: "05_match_results_snapshot.json",
    });
    zip.append(judgeScoresXlsx, { name: "07_judge_scores.xlsx" });
    zip.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    await zip.finalize();
    const buffer = await bufferFromStream(pass);

    const titlePart = sanitizeApplicantExcelFilenamePart(
      archive.eventSnapshot.title || "대회",
    );
    const filename = `MATCHON_${titlePart}_${ymdFileStamp()}_archive.zip`;

    return { buffer, filename };
  },
};
