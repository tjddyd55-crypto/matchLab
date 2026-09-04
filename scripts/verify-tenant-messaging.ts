/**
 * Tenant messaging verify — no paid SMS.
 *   npm run verify:tenant-messaging
 */
import assert from "node:assert/strict";
import {
  buildMessagingRecipientCandidate,
  dedupeMessagingRecipients,
  summarizeMessagingRecipients,
} from "../src/lib/messaging/messaging-phone";
import {
  decryptPiiUtf8,
  encryptPiiUtf8,
} from "../src/lib/crypto/pii-aes";

function maskApiKeyHint(apiKey: string | null | undefined): string {
  if (!apiKey?.trim()) return "미설정";
  return `********${apiKey.slice(-4)}`;
}
import { classifyMatchonSmsMessage } from "../src/lib/messaging/sms-classification";
import {
  testTenantAligoConnection,
  sendTenantAligoSms,
} from "../src/server/messaging/services/tenant-aligo-connection-test";
import { FakeAligoTransport } from "../src/server/messaging/transport/matchon-aligo-transport";
import { buildIdempotencyScope } from "../src/server/messaging/domain/matchon-message-policy";

function testPhoneNormalization() {
  const valid = buildMessagingRecipientCandidate({
    referenceType: "gym_member",
    referenceId: "m1",
    name: "홍길동",
    phone: "010-1234-5678",
  });
  assert.equal(valid.eligible, true);
  assert.equal(valid.normalizedPhone, "01012345678");

  const invalid = buildMessagingRecipientCandidate({
    referenceType: "gym_member",
    referenceId: "m2",
    name: "없음",
    phone: "",
  });
  assert.equal(invalid.eligible, false);

  const duped = dedupeMessagingRecipients([
    valid,
    {
      ...valid,
      referenceId: "m3",
    },
  ]);
  assert.equal(duped.filter((r) => r.eligible).length, 1);
  assert.equal(duped[1].excludedReason, "중복 번호");

  const summary = summarizeMessagingRecipients(duped);
  assert.equal(summary.eligibleCount, 1);
  console.log("verify:tenant-messaging-phone: OK");
}

function testEncryptionRoundtrip() {
  if (!process.env.MATCHON_PII_ENCRYPTION_KEY) {
    process.env.MATCHON_PII_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  }
  const encrypted = encryptPiiUtf8("test-api-key-1234");
  const plain = decryptPiiUtf8(encrypted);
  assert.equal(plain, "test-api-key-1234");
  assert.equal(maskApiKeyHint("test-api-key-1234"), "********1234");
  console.log("verify:tenant-messaging-encryption: OK");
}

function testTenantIsolationScope() {
  assert.equal(buildIdempotencyScope("gym", "gym-a", null), "gym:gym-a");
  assert.equal(
    buildIdempotencyScope("association", null, "org-a"),
    "association:org-a",
  );
  assert.notEqual(
    buildIdempotencyScope("gym", "gym-a", null),
    buildIdempotencyScope("gym", "gym-b", null),
  );
  console.log("verify:tenant-messaging-isolation: OK");
}

async function testAligoAdapterMock() {
  const transport = new FakeAligoTransport(() => ({
    ok: true,
    status: 200,
    data: { result_code: "1", message: "ok", msg_id: "1" },
    latencyMs: 1,
    summary: "ok",
  }));

  const conn = await testTenantAligoConnection(
    {
      loginId: "user",
      apiKey: "key",
      senderPhone: "01012345678",
    },
    transport,
  );
  assert.equal(conn.ok, true);

  const send = await sendTenantAligoSms(
    {
      credentials: {
        loginId: "user",
        apiKey: "key",
        senderPhone: "01012345678",
      },
      receiver: "01012345678",
      body: "테스트",
      msgType: "SMS",
      dispatchId: "d1",
      recipientId: "r1",
    },
    transport,
  );
  assert.equal(send.accepted, true);
  console.log("verify:tenant-messaging-aligo-mock: OK");
}

function testSmsClassification() {
  const sms = classifyMatchonSmsMessage({ body: "안녕" });
  assert.equal(sms.type, "sms");
  const lms = classifyMatchonSmsMessage({
    body: "가".repeat(80),
    subject: "제목",
  });
  assert.equal(lms.type, "lms");
  console.log("verify:tenant-messaging-sms-classification: OK");
}

async function main() {
  testPhoneNormalization();
  testEncryptionRoundtrip();
  testTenantIsolationScope();
  testSmsClassification();
  await testAligoAdapterMock();
  console.log("verify:tenant-messaging: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
