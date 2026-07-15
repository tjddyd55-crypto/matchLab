/**
 * 날짜 입력 연도 4자리·YYYY-MM-DD SSOT
 *   npm run verify:date-input-four-digit-year
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isValidDateOnlyString,
  normalizeDateOnlyInput,
  parseDateOnlyString,
} from "../src/lib/date-only";

function main() {
  assert.equal(normalizeDateOnlyInput("19845"), "1984-5"); // 5번째 숫자는 월 시작 — 연도는 4자리 고정
  assert.equal(normalizeDateOnlyInput("198402"), "1984-02");
  assert.equal(normalizeDateOnlyInput("19840218"), "1984-02-18");
  assert.equal(normalizeDateOnlyInput("1984-02-18"), "1984-02-18");
  assert.equal(normalizeDateOnlyInput("abc19840218xyz"), "1984-02-18");
  assert.equal(normalizeDateOnlyInput("19841231xxxx").slice(0, 4), "1984");
  assert.equal(isValidDateOnlyString("1984-02-18"), true);
  assert.equal(isValidDateOnlyString("1984-02-30"), false);
  assert.equal(isValidDateOnlyString("19840218"), false);
  assert.ok(parseDateOnlyString("2000-02-29"));
  assert.equal(parseDateOnlyString("2001-02-29"), null);

  const appDate = readFileSync(
    join(process.cwd(), "src/components/shared/AppDateInput.tsx"),
    "utf8",
  );
  assert.ok(appDate.includes("normalizeDateOnlyInput"));
  assert.ok(appDate.includes('maxLength={10}'));

  // Gym fighter form must use AppDateInput, not bare type=date for birthDate
  const gymForm = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/fighters/GymFighterForm.tsx",
    ),
    "utf8",
  );
  assert.ok(gymForm.includes("AppDateInput"));
  assert.equal(/name=\"birthDate\"[\s\S]*?type=\"date\"/.test(gymForm), false);

  console.log("verify:date-input-four-digit-year: OK");
}

main();
