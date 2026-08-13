/**
 * 선수 신청 공통 프로필 + 보험 주민번호 보안 / 동의 / 회원권 종료일 / 목록 / 체급 Dropzone
 *
 *   npm run verify:athlete-application-profile
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  encryptPiiUtf8,
  decryptPiiUtf8,
  parsePiiEncryptionKey,
} from "../src/lib/crypto/pii-aes";
import {
  SAMPLE_RESIDENT_REGISTRATION_NUMBER,
  maskResidentRegistrationNumber,
  parseResidentRegistrationNumber,
} from "../src/lib/athlete-application/resident-registration-number";
import {
  INSURANCE_PII_CONSENT_TYPE,
  buildInsuranceConsentSnapshot,
  parseExcelInsuranceConsent,
} from "../src/lib/athlete-application/insurance-consent";
import { sanitizePiiForLog } from "../src/lib/athlete-application/sanitize-pii-log";
import {
  addMembershipDuration,
  calculateMembershipEndDate,
} from "../src/lib/gym-member/membership-duration";
import { GymMembershipDurationType } from "../src/lib/enums";
import { formatMembershipPeriodRemaining } from "../src/lib/gym-member/membership-list-metrics";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

function verifyAthleteApplicationProfile() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /recordText\s+String\?/);
  assert.match(schema, /careerText\s+String\?/);
  assert.match(schema, /insuranceRrnCipher\s+Bytes\?/);
  assert.doesNotMatch(
    read("prisma/schema.prisma").slice(
      schema.indexOf("model GymMember"),
      schema.indexOf("model GymMemberSubscription"),
    ),
    /insuranceRrn|residentRegistration|rrn/i,
  );

  const service = read("src/lib/services/application.service.ts");
  assert.match(service, /createGymEventApplication/);
  assert.match(service, /encryptInsuranceResidentNumber/);
  assert.match(service, /insuranceConsent/);

  const createForm = read(
    "src/components/domain/applications/EventApplicationForm.tsx",
  );
  assert.match(createForm, /AthleteInsuranceProfileFields/);
  const manual = read(
    "src/components/domain/applications/OrganizerManualApplicationPanel.tsx",
  );
  assert.match(manual, /insuranceConsentConfirmed/);
  const external = read(
    "src/components/domain/applications/ExternalRegistrationPublicForm.tsx",
  );
  assert.match(external, /sessionStorage\.setItem/);
  assert.match(
    external,
    /athletes: athletes\.map\(\(a\) => \(\{[\s\S]*?residentRegistrationNumber: ""/,
  );
  console.log("verify:athlete-application-profile OK");
}

function verifyResidentIdSecurity() {
  const parsed = parseResidentRegistrationNumber(
    SAMPLE_RESIDENT_REGISTRATION_NUMBER,
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.digits, "0000000000001");
  assert.equal(maskResidentRegistrationNumber(parsed.digits), "000000-0******");
  assert.equal(parseResidentRegistrationNumber("900101-1234567").ok, false);
  assert.equal(parseResidentRegistrationNumber("123").ok, false);

  const prev = process.env.MATCHON_PII_ENCRYPTION_KEY;
  process.env.MATCHON_PII_ENCRYPTION_KEY = "a".repeat(64);
  const blob = encryptPiiUtf8(parsed.digits);
  assert.notEqual(blob.cipher.toString("utf8"), parsed.digits);
  assert.equal(decryptPiiUtf8(blob), parsed.digits);
  if (prev === undefined) delete process.env.MATCHON_PII_ENCRYPTION_KEY;
  else process.env.MATCHON_PII_ENCRYPTION_KEY = prev;

  const log = sanitizePiiForLog({
    residentRegistrationNumber: "000000-0000001",
    memo: "연락 000000-0000001",
  }) as Record<string, unknown>;
  assert.equal(log.residentRegistrationNumber, "[REDACTED]");
  assert.equal(log.memo, "연락 [REDACTED_RRN]");

  const key = parsePiiEncryptionKey("b".repeat(64));
  assert.equal(key.length, 32);

  const sql = read(
    "scripts/sql/add-event-application-insurance-pii-additive.sql",
  )
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.doesNotMatch(sql, /DROP\s+|TRUNCATE/i);
  console.log("verify:athlete-resident-id-security OK");
}

function verifyInsuranceConsent() {
  const snap = buildInsuranceConsentSnapshot({
    agreedAt: new Date("2026-08-13T00:00:00.000Z"),
    appliedByUserId: "user-1",
    provenance: "organizer_confirmed",
  });
  assert.equal(snap.type, INSURANCE_PII_CONSENT_TYPE);
  assert.equal(snap.agreed, true);
  assert.equal(snap.provenance, "organizer_confirmed");
  assert.match(snap.text, /보험/);
  assert.equal(parseExcelInsuranceConsent("동의").ok, true);
  assert.equal(parseExcelInsuranceConsent("Y").ok, true);
  assert.equal(parseExcelInsuranceConsent("").ok, false);
  const sample = read("src/lib/applicant-excel/sample.ts");
  assert.match(sample, /보험가입 개인정보 동의를 받은 선수만/);
  console.log("verify:athlete-insurance-consent OK");
}

function verifyMembershipEndDate() {
  const three = calculateMembershipEndDate(
    new Date(Date.UTC(2026, 7, 11)),
    GymMembershipDurationType.months,
    3,
  );
  assert.equal(three!.toISOString().slice(0, 10), "2026-11-10");

  const jan = calculateMembershipEndDate(
    new Date(Date.UTC(2026, 0, 1)),
    GymMembershipDurationType.months,
    1,
  );
  assert.equal(jan!.toISOString().slice(0, 10), "2026-01-31");

  const monthEnd = calculateMembershipEndDate(
    new Date(Date.UTC(2026, 0, 31)),
    GymMembershipDurationType.months,
    1,
  );
  assert.equal(monthEnd!.toISOString().slice(0, 10), "2026-02-27");

  const jan30 = calculateMembershipEndDate(
    new Date(Date.UTC(2026, 0, 30)),
    GymMembershipDurationType.months,
    1,
  );
  assert.equal(jan30!.toISOString().slice(0, 10), "2026-02-27");

  const leapStart = calculateMembershipEndDate(
    new Date(Date.UTC(2024, 0, 31)),
    GymMembershipDurationType.months,
    1,
  );
  assert.equal(leapStart!.toISOString().slice(0, 10), "2024-02-28");

  const leap = calculateMembershipEndDate(
    new Date(Date.UTC(2024, 1, 29)),
    GymMembershipDurationType.months,
    1,
  );
  assert.equal(leap!.toISOString().slice(0, 10), "2024-03-28");

  const mar31 = calculateMembershipEndDate(
    new Date(Date.UTC(2026, 2, 31)),
    GymMembershipDurationType.months,
    1,
  );
  assert.equal(mar31!.toISOString().slice(0, 10), "2026-04-29");

  const days = addMembershipDuration(
    new Date(Date.UTC(2026, 5, 1)),
    GymMembershipDurationType.days,
    30,
  );
  assert.equal(days!.toISOString().slice(0, 10), "2026-06-30");
  console.log("verify:membership-end-date OK");
}

function verifyMemberListOperations() {
  const table = read("src/components/domain/gym-members/MemberTable.tsx");
  assert.match(table, /이용시작일/);
  assert.match(table, /이용종료일/);
  assert.match(table, /이용기간\/잔여/);
  assert.match(table, /출석횟수/);
  assert.match(table, /결제금액/);
  assert.doesNotMatch(table, />등급</);
  const mobile = read("src/components/domain/gym-members/MemberMobileCard.tsx");
  assert.doesNotMatch(mobile, /rankName/);
  const svc = read("src/lib/services/gym-member.service.ts");
  assert.match(svc, /countAttendancesSinceStarts/);
  assert.match(svc, /sumNetPaidBySubscriptionIds/);
  assert.doesNotMatch(svc, /for \(const row of rows\)[\s\S]{0,80}countMemberAttendances/);
  const period = formatMembershipPeriodRemaining({
    durationType: "months",
    durationValue: 3,
    endsAt: new Date(Date.UTC(2026, 10, 10)),
    todayUtc: new Date(Date.UTC(2026, 7, 13)),
  });
  assert.match(period ?? "", /3개월/);
  console.log("verify:member-list-operations OK");
  console.log("verify:member-list-attendance-aggregate OK");
}

function verifyWeightClassDropzone() {
  const dialog = read(
    "src/components/domain/division-templates/DivisionTemplateExcelImportDialog.tsx",
  );
  assert.match(dialog, /FileDropzone/);
  assert.match(dialog, /체급표 Excel 일괄 등록/);
  assert.match(dialog, /샘플 엑셀 다운로드/);
  assert.doesNotMatch(dialog, /<input\s+type="file"/);
  console.log("verify:weight-class-dropzone OK");
}

function main() {
  verifyAthleteApplicationProfile();
  verifyResidentIdSecurity();
  verifyInsuranceConsent();
  verifyMembershipEndDate();
  verifyMemberListOperations();
  verifyWeightClassDropzone();
}

main();
