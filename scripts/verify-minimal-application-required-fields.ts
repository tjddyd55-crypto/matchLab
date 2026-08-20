/**
 * 1차 신청 최소 필수값 — PII·동의·서명 미포함
 *
 *   npm run verify:minimal-application-required-fields
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MINIMAL_APPLICATION_REQUIRED_FIELDS } from "../src/lib/applications/minimal-application";
import { APPLICANT_EXCEL_REQUIRED_HEADERS } from "../src/lib/applicant-excel/columns";
import {
  parseOptionalExcelInsuranceConsent,
  parseExcelInsuranceConsent,
} from "../src/lib/athlete-application/insurance-consent";
import {
  parseOptionalResidentRegistrationNumber,
  parseResidentRegistrationNumber,
} from "../src/lib/athlete-application/resident-registration-number";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

function main() {
  assert.deepEqual([...APPLICANT_EXCEL_REQUIRED_HEADERS], [
    ...MINIMAL_APPLICATION_REQUIRED_FIELDS,
  ]);
  assert.ok(!APPLICANT_EXCEL_REQUIRED_HEADERS.includes("생년월일" as never));
  assert.ok(!APPLICANT_EXCEL_REQUIRED_HEADERS.includes("주민등록번호" as never));

  const emptyRrn = parseOptionalResidentRegistrationNumber("");
  assert.equal(emptyRrn.ok, true);
  if (emptyRrn.ok) assert.equal(emptyRrn.digits, null);

  const strictRrn = parseResidentRegistrationNumber("");
  assert.equal(strictRrn.ok, false);

  const emptyConsent = parseOptionalExcelInsuranceConsent("");
  assert.equal(emptyConsent.ok, true);
  if (emptyConsent.ok) assert.equal(emptyConsent.agreed, false);

  const strictConsent = parseExcelInsuranceConsent("");
  assert.equal(strictConsent.ok, false);

  const svc = read("src/lib/services/application.service.ts");
  assert.match(svc, /insurancePiiRequired/);
  assert.match(svc, /insurancePiiRequired:\s*false/);
  assert.match(svc, /fighterBirthDateForPersist/);

  const birth = read("src/lib/fighter/birth-date.ts");
  assert.match(birth, /formatFighterBirthDateDisplay/);
  assert.doesNotMatch(birth, /1900-01-01/);

  const schema = read("prisma/schema.prisma");
  assert.match(schema, /birthDate\s+DateTime\?/);

  console.log("verify:minimal-application-required-fields OK");
}

main();
