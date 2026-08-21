/**
 * EventApplication 추가정보 수신번호 snapshot isolation
 *   npm run verify:additional-info-recipient-snapshot
 */
import assert from "node:assert/strict";
import {
  hasRecipientPhoneDrift,
  resolveAdditionalInfoSendRecipient,
} from "../src/lib/additional-info/recipient.ts";

function main() {
  const birthAdult = new Date("1990-01-01T00:00:00.000Z");
  const birthMinor = new Date("2015-05-01T00:00:00.000Z");
  const ref = new Date("2026-08-21T00:00:00.000Z");

  // 최초 요청: Fighter live
  const first = resolveAdditionalInfoSendRecipient({
    birthDate: birthAdult,
    athletePhone: "01011112222",
    guardianPhone: null,
    resend: false,
    referenceDate: ref,
  });
  assert.equal(first.ok, true);
  if (first.ok) assert.equal(first.phone, "01011112222");

  // 재전송: snapshot 유지 (live 변경 무시)
  const resend = resolveAdditionalInfoSendRecipient({
    birthDate: birthAdult,
    athletePhone: "01099998888",
    guardianPhone: null,
    snapshotPhone: "01011112222",
    snapshotRecipientType: "ATHLETE",
    resend: true,
    referenceDate: ref,
  });
  assert.equal(resend.ok, true);
  if (resend.ok) {
    assert.equal(resend.phone, "01011112222");
    assert.match(resend.maskedPhone, /\*\*\*\*/);
  }

  // 명시적 refresh: live로 snapshot 갱신
  const refresh = resolveAdditionalInfoSendRecipient({
    birthDate: birthAdult,
    athletePhone: "01099998888",
    guardianPhone: null,
    snapshotPhone: "01011112222",
    snapshotRecipientType: "ATHLETE",
    resend: true,
    refreshFromFighter: true,
    referenceDate: ref,
  });
  assert.equal(refresh.ok, true);
  if (refresh.ok) assert.equal(refresh.phone, "01099998888");

  // multi-event: A snapshot vs B first request
  const eventAResend = resolveAdditionalInfoSendRecipient({
    birthDate: birthAdult,
    athletePhone: "01022223333",
    guardianPhone: null,
    snapshotPhone: "01011112222",
    snapshotRecipientType: "ATHLETE",
    resend: true,
    referenceDate: ref,
  });
  const eventBFirst = resolveAdditionalInfoSendRecipient({
    birthDate: birthAdult,
    athletePhone: "01022223333",
    guardianPhone: null,
    resend: false,
    referenceDate: ref,
  });
  assert.equal(eventAResend.ok && eventAResend.phone, "01011112222");
  assert.equal(eventBFirst.ok && eventBFirst.phone, "01022223333");

  // guardian isolation
  const guardResend = resolveAdditionalInfoSendRecipient({
    birthDate: birthMinor,
    athletePhone: "01000001111",
    guardianPhone: "01077778888",
    snapshotPhone: "01055556666",
    snapshotRecipientType: "GUARDIAN",
    resend: true,
    referenceDate: ref,
  });
  assert.equal(guardResend.ok, true);
  if (guardResend.ok) {
    assert.equal(guardResend.recipientType, "GUARDIAN");
    assert.equal(guardResend.phone, "01055556666");
  }

  assert.equal(
    hasRecipientPhoneDrift({
      snapshotPhone: "01011112222",
      livePhone: "01099998888",
    }),
    true,
  );
  assert.equal(
    hasRecipientPhoneDrift({
      snapshotPhone: "010-1111-2222",
      livePhone: "01011112222",
    }),
    false,
  );

  console.log("verify:additional-info-recipient-snapshot OK");
}

main();
