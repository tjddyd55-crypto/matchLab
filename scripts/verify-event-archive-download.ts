/**
 * 대회 기록 archive download 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const zipService = read("src/lib/services/event-archive-zip.service.ts");
assert.match(zipService, /README\.txt/);
assert.match(zipService, /manifest\.json/);
assert.match(zipService, /02_applications\.xlsx/);
assert.match(zipService, /03_weigh_in\.xlsx/);
assert.match(zipService, /07_judge_scores\.xlsx/);
assert.match(zipService, /eventArchiveApplicantExcelService/);
assert.match(zipService, /eventArchivePackageExportService/);

const route = read("src/app/api/organizer/events/[eventId]/archive-zip/route.ts");
assert.match(route, /application\/zip/);
assert.match(route, /requireActorFromMutation/);

const downloadPanel = read("src/components/domain/events/EventArchiveDownloadPanel.tsx");
assert.match(downloadPanel, /archive-zip/);
assert.match(downloadPanel, /weigh-in-sheet-pdf/);
assert.match(downloadPanel, /brackets\/print-pdf/);

console.log("verify:event-archive-download: OK");
