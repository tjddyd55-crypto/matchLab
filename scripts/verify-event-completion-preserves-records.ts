/**
 * 대회 종료 시 기록 보존·write guard 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const finishTx = read("src/lib/services/event.service.ts");
assert.match(finishTx, /createArchiveInTransaction/);
assert.ok(!finishTx.includes("deleteMany"), "finish must not delete business data");

const matchService = read("src/lib/services/match.service.ts");
assert.match(matchService, /assertEventWritable/);

const resultService = read("src/lib/services/result.service.ts");
assert.match(resultService, /assertEventWritable/);

const judgeOps = read("src/lib/services/match-ops-judge-score.service.ts");
assert.match(judgeOps, /assertEventWritable/);
assert.match(judgeOps, /EventStatus\.finished/);

const fieldStatus = read("src/lib/services/field-status.service.ts");
assert.match(fieldStatus, /assertEventWritable/);

const judgePortal = read("src/lib/services/judge-scorecard.service.ts");
assert.match(judgePortal, /assertEventWritable/);

const application = read("src/lib/services/application.service.ts");
assert.match(application, /assertEventWritable/);

const bracket = read("src/lib/services/bracket.service.ts");
assert.match(bracket, /assertEventWritable/);

const judgeCourt = read("src/lib/services/judge-court.service.ts");
assert.match(judgeCourt, /assertEventWritable/);

console.log("verify:event-completion-preserves-records: OK");
