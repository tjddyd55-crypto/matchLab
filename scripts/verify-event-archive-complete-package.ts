/**
 * 종료 대회 archive ZIP 패키지 구성 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const zipService = read("src/lib/services/event-archive-zip.service.ts");
const packageExport = read("src/lib/services/event-archive-package-export.service.ts");

assert.match(zipService, /03_weigh_in\.xlsx/);
assert.match(zipService, /05_match_results\.xlsx/);
assert.match(zipService, /07_judge_scores\.xlsx/);
assert.match(zipService, /manifest\.json/);
assert.match(zipService, /judgeScoreCount/);
assert.match(zipService, /weighInCount/);
assert.match(zipService, /eventArchivePackageExportService/);

assert.match(packageExport, /buildWeighInWorkbook/);
assert.match(packageExport, /buildResultsWorkbookFromSnapshot/);
assert.match(packageExport, /buildJudgeScoresWorkbook/);

const route = read("src/app/api/organizer/events/[eventId]/archive-zip/route.ts");
assert.match(route, /cookieHeader/);

console.log("verify:event-archive-complete-package: OK");
