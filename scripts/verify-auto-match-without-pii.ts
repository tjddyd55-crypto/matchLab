/**
 * 자동대진 — PII 미입력 선수도 eligibility 에서 제외되지 않음
 *
 *   npm run verify:auto-match-without-pii
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

function main() {
  const autoMatch = read("src/lib/services/bracket-auto-match.service.ts");
  assert.doesNotMatch(autoMatch, /insuranceRrn/);
  assert.doesNotMatch(autoMatch, /insuranceConsent/);

  const recordPriority = read("src/lib/brackets/record-auto-match.ts");
  assert.doesNotMatch(recordPriority, /insuranceRrn/);
  assert.doesNotMatch(recordPriority, /insuranceConsent/);

  const appSvc = read("src/lib/services/application.service.ts");
  assert.match(appSvc, /insurancePiiRequired:\s*false/);

  console.log("verify:auto-match-without-pii OK");
}

main();
