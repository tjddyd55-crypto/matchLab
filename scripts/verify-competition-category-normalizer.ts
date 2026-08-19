/**
 * 경기구분 정규화
 *
 *   npm run verify:competition-category-normalizer
 */
import assert from "node:assert/strict";
import { normalizeCompetitionCategory } from "../src/lib/applications/competition-category";

function expectCanonical(
  raw: string,
  canonical: string,
  grade: number | null = null,
) {
  const n = normalizeCompetitionCategory(raw);
  assert.equal(n.status, "ok", raw);
  assert.equal(n.canonical, canonical, raw);
  assert.equal(n.schoolGrade, grade, raw);
}

function expectUnknown(raw: string) {
  const n = normalizeCompetitionCategory(raw);
  assert.equal(n.status, "unknown", raw);
}

function main() {
  for (const raw of ["초등부", "초등", "초등학생", "초등학교"]) {
    expectCanonical(raw, "ELEMENTARY");
  }
  expectCanonical("초1", "ELEMENTARY", 1);
  expectCanonical("초3", "ELEMENTARY", 3);
  expectCanonical("초6", "ELEMENTARY", 6);

  for (const raw of ["중등부", "중학생", "중등"]) {
    expectCanonical(raw, "MIDDLE");
  }
  expectCanonical("중1", "MIDDLE", 1);
  expectCanonical("중3", "MIDDLE", 3);

  for (const raw of ["고등부", "고등학생", "고등"]) {
    expectCanonical(raw, "HIGH");
  }
  expectCanonical("고1", "HIGH", 1);
  expectCanonical("고3", "HIGH", 3);

  for (const raw of ["성인", "성인부", "일반", "일반부", "대학·일반부"]) {
    expectCanonical(raw, "ADULT");
  }

  for (const raw of ["학생", "학생부", "청소년", "기타"]) {
    expectUnknown(raw);
  }

  console.log("verify:competition-category-normalizer OK");
}

main();
