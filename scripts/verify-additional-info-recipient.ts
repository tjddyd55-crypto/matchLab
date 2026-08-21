/**
 * 추가정보 수신자 SSOT
 *   npm run verify:additional-info-recipient
 */
import assert from "node:assert/strict";
import { resolveAdditionalInfoRecipient } from "../src/lib/additional-info/recipient.ts";

function main() {
  const adultOk = resolveAdditionalInfoRecipient({
    birthDate: new Date("1990-01-01T00:00:00.000Z"),
    athletePhone: "01012345678",
    guardianPhone: null,
    referenceDate: new Date("2026-08-21T00:00:00.000Z"),
  });
  assert.equal(adultOk.ok, true);
  if (adultOk.ok) {
    assert.equal(adultOk.recipientType, "ATHLETE");
    assert.equal(adultOk.isMinor, false);
    assert.match(adultOk.maskedPhone, /\*\*\*\*/);
  }

  const adultMissing = resolveAdditionalInfoRecipient({
    birthDate: new Date("1990-01-01T00:00:00.000Z"),
    athletePhone: "",
    guardianPhone: "01099998888",
    referenceDate: new Date("2026-08-21T00:00:00.000Z"),
  });
  assert.equal(adultMissing.ok, false);
  if (!adultMissing.ok) {
    assert.equal(adultMissing.code, "MISSING_ATHLETE_PHONE");
    assert.match(adultMissing.message, /선수 연락처/);
  }

  const minorOk = resolveAdditionalInfoRecipient({
    birthDate: new Date("2015-05-01T00:00:00.000Z"),
    athletePhone: "01011112222",
    guardianPhone: "01033334444",
    referenceDate: new Date("2026-08-21T00:00:00.000Z"),
  });
  assert.equal(minorOk.ok, true);
  if (minorOk.ok) {
    assert.equal(minorOk.recipientType, "GUARDIAN");
    assert.equal(minorOk.isMinor, true);
  }

  const minorMissing = resolveAdditionalInfoRecipient({
    birthDate: new Date("2015-05-01T00:00:00.000Z"),
    athletePhone: "01011112222",
    guardianPhone: null,
    referenceDate: new Date("2026-08-21T00:00:00.000Z"),
  });
  assert.equal(minorMissing.ok, false);
  if (!minorMissing.ok) {
    assert.equal(minorMissing.code, "MISSING_GUARDIAN_PHONE");
    assert.match(minorMissing.message, /보호자/);
  }

  console.log("verify:additional-info-recipient OK");
}

main();
