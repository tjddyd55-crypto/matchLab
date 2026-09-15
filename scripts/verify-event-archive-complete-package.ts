/**
 * 종료 대회 archive ZIP 패키지 구성 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildArchivePackageManifest,
  buildArchiveReadmeText,
  encodeArchiveReadmeUtf8,
  resolveArchivePackageIncludedFiles,
} from "../src/lib/event-archive/archive-package-manifest";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const zipService = read("src/lib/services/event-archive-zip.service.ts");
const packageExport = read("src/lib/services/event-archive-package-export.service.ts");
const manifestModule = read("src/lib/event-archive/archive-package-manifest.ts");

assert.match(zipService, /README\.txt/);
assert.match(zipService, /buildArchivePackageManifest/);
assert.match(zipService, /buildArchiveReadmeText/);
assert.match(zipService, /encodeArchiveReadmeUtf8/);
assert.match(zipService, /03_weigh_in\.xlsx/);
assert.match(zipService, /05_match_results\.xlsx/);
assert.match(zipService, /07_judge_scores\.xlsx/);
assert.match(zipService, /manifest\.json/);
assert.match(zipService, /judgeScoreCount/);
assert.match(zipService, /weighInCount/);
assert.match(zipService, /eventArchivePackageExportService/);

assert.match(packageExport, /buildWeighInWorkbook/);
assert.match(packageExport, /buildResultsWorkbookFromSnapshot/);
assert.match(packageExport, /projectArchiveMatchResults/);
assert.match(packageExport, /redFighterName/);
assert.match(packageExport, /buildJudgeScoresWorkbook/);

assert.match(manifestModule, /resolveArchivePackageIncludedFiles/);

const route = read("src/app/api/organizer/events/[eventId]/archive-zip/route.ts");
assert.match(route, /cookieHeader/);

const withoutPdf = resolveArchivePackageIncludedFiles({
  includeWeighInPdf: false,
  includeBracketPdf: false,
});
assert.ok(!withoutPdf.some((f) => f.name === "03_weigh_in.pdf"));
assert.ok(!withoutPdf.some((f) => f.name === "04_brackets.pdf"));

const withPdf = resolveArchivePackageIncludedFiles({
  includeWeighInPdf: true,
  includeBracketPdf: true,
});
assert.ok(withPdf.some((f) => f.name === "03_weigh_in.pdf"));
assert.ok(withPdf.some((f) => f.name === "04_brackets.pdf"));

const manifest = buildArchivePackageManifest({
  eventId: "evt-1",
  eventName: "테스트 대회",
  completedAt: "2026-09-01T10:00:00.000Z",
  exportedAt: "2026-09-01T12:00:00.000Z",
  archiveVersion: 1,
  applicationCount: 10,
  matchCount: 26,
  confirmedResultCount: 52,
  judgeScoreCount: 3,
  weighInCount: 8,
  includeWeighInPdf: false,
  includeBracketPdf: true,
});

assert.deepEqual(
  manifest.files,
  [
    ...withoutPdf.map((f) => f.name).slice(0, 3),
    "04_brackets.pdf",
    ...withoutPdf.map((f) => f.name).slice(3),
  ],
);
assert.equal(manifest.sources["03_weigh_in.pdf"], "skipped");
assert.equal(manifest.sources["04_brackets.pdf"], "live_read_only");

const readme = buildArchiveReadmeText({
  eventName: "테스트 대회",
  completedAt: "2026-09-01T10:00:00.000Z",
  exportedAt: "2026-09-01T12:00:00.000Z",
  includedFiles: manifest.files,
});

assert.match(readme, /MATCHON 대회 기록 보관 파일 안내/);
assert.match(readme, /대회명: 테스트 대회/);
assert.match(readme, /대회 종료일시:/);
assert.match(readme, /기록 생성일시:/);
assert.match(readme, /Excel\/PDF 파일은 사람이 확인하기 위한 자료입니다/);
assert.match(readme, /JSON 파일은 대회 종료 당시의 원본 데이터를 보존하는 파일이므로/);
assert.match(readme, /05_match_results\.xlsx/);
assert.match(readme, /07_judge_scores\.xlsx/);
assert.match(readme, /manifest\.json/);
assert.match(readme, /README\.txt/);
assert.doesNotMatch(readme, /03_weigh_in\.pdf/);

const readmeWithPdf = buildArchiveReadmeText({
  eventName: "테스트 대회",
  completedAt: "2026-09-01T10:00:00.000Z",
  exportedAt: "2026-09-01T12:00:00.000Z",
  includedFiles: withPdf.map((f) => f.name).concat("manifest.json"),
});
assert.match(readmeWithPdf, /03_weigh_in\.pdf/);

const encoded = encodeArchiveReadmeUtf8("한글 테스트");
assert.equal(encoded[0], 0xef);
assert.equal(encoded[1], 0xbb);
assert.equal(encoded[2], 0xbf);
assert.match(encoded.subarray(3).toString("utf8"), /한글 테스트/);

console.log("verify:event-archive-complete-package: OK");
