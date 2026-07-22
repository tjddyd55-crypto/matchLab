/**
 * MATCHON messaging isolation / dry-run / real-send guard verifies.
 *   npm run verify:matchon-messaging
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  canMatchonRealSend,
  loadMatchonMessagingConfig,
} from "../src/server/messaging/config/matchon-messaging-config";
import { evaluateMatchonRealSendGate } from "../src/server/messaging/domain/matchon-message-policy";
import { MatchonDryRunProvider } from "../src/server/messaging/providers/matchon-dry-run-provider";
import { MatchonAligoSmsProvider } from "../src/server/messaging/providers/matchon-aligo-sms-provider";
import { MatchonAligoKakaoProvider } from "../src/server/messaging/providers/matchon-aligo-kakao-provider";
import { FakeAligoTransport } from "../src/server/messaging/transport/matchon-aligo-transport";
import { renderMatchonMessageTemplate } from "../src/server/messaging/templates/matchon-message-template-renderer";
import {
  computeMatchonTemplateFingerprint,
  isMatchonTemplateFingerprintMatch,
} from "../src/server/messaging/templates/matchon-template-fingerprint";
import {
  formatMatchonPhone,
  maskMatchonPhone,
  normalizeMatchonPhone,
  validateMatchonPhone,
} from "../src/server/messaging/utils/matchon-phone";
import { classifyMatchonSmsMessage } from "../src/server/messaging/utils/matchon-sms-length";
import { presenceOnly, maskMatchonSecret } from "../src/server/messaging/utils/matchon-secret-mask";
import { getAdminNavItems } from "../src/lib/navigation/admin-navigation";
import { getGymPortalNavItems } from "../src/lib/navigation/gym-portal-navigation";
import { buildIdempotencyScope } from "../src/server/messaging/domain/matchon-message-policy";

const root = process.cwd();

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "generated") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTsFiles(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

function assertIsolation() {
  const files = walkTsFiles(join(root, "src")).concat(
    walkTsFiles(join(root, "scripts")).filter((f) =>
      f.includes("matchon-messaging"),
    ),
  );
  const bannedImport =
    /from\s+['"][^'"]*(insurance|crm-government|liquor|governmentSupport)[^'"]*['"]|require\(['"][^'"]*(insurance|crm-government|liquor)[^'"]*['"]\)/i;
  const bannedEnvUsage =
    /process\.env\.(INSURANCE_|GOVERNMENT_|LIQUOR_|CRM_)/;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (bannedImport.test(text)) {
      assert.fail(`foreign import in ${file}`);
    }
    if (file.includes("messaging") && bannedEnvUsage.test(text)) {
      assert.fail(`foreign env usage in ${file}`);
    }
  }
  console.log("verify:matchon-messaging-isolation: OK");
}

function assertConfig() {
  const cfg = loadMatchonMessagingConfig({
    MATCHON_MESSAGING_ENABLED: "true",
    MATCHON_MESSAGING_DRY_RUN: "true",
    MATCHON_MESSAGING_ALLOW_REAL_SEND: "false",
    MATCHON_ALIGO_SMS_ENABLED: "false",
    MATCHON_ALIGO_KAKAO_ENABLED: "false",
  });
  assert.equal(cfg.dryRun, true);
  assert.equal(cfg.allowRealSend, false);
  assert.equal(canMatchonRealSend(cfg), false);
  assert.equal(presenceOnly(""), false);
  assert.equal(maskMatchonSecret("secret-value"), "(설정됨)");
  assert.equal(maskMatchonSecret(""), "(없음)");
  console.log("verify:matchon-messaging-config: OK");
}

async function assertDryRunAndGuard() {
  const transport = new FakeAligoTransport();
  const cfg = loadMatchonMessagingConfig({
    MATCHON_MESSAGING_ENABLED: "true",
    MATCHON_MESSAGING_DRY_RUN: "true",
    MATCHON_MESSAGING_ALLOW_REAL_SEND: "false",
    MATCHON_ALIGO_SMS_ENABLED: "true",
    MATCHON_ALIGO_SMS_API_KEY: "x",
    MATCHON_ALIGO_SMS_USER_ID: "y",
    MATCHON_ALIGO_SMS_SENDER: "01012345678",
    MATCHON_ALIGO_KAKAO_ENABLED: "true",
    MATCHON_ALIGO_KAKAO_API_KEY: "x",
    MATCHON_ALIGO_KAKAO_USER_ID: "y",
    MATCHON_ALIGO_KAKAO_SENDER_KEY: "sk",
  });

  const gate = evaluateMatchonRealSendGate({
    config: cfg,
    commandAllowRealSend: true,
  });
  assert.equal(gate.allowed, false);

  const dry = new MatchonDryRunProvider("sms");
  const dryResult = await dry.send({
    dispatchId: "d1",
    recipientId: "r1",
    recipientPhone: "01012345678",
    body: "hello",
    idempotencyKey: "k1",
  });
  assert.equal(dryResult.dryRun, true);
  assert.equal(dryResult.accepted, true);

  const sms = new MatchonAligoSmsProvider(cfg, transport, {
    commandAllowRealSend: true,
  });
  await sms.send({
    dispatchId: "d1",
    recipientId: "r1",
    recipientPhone: "01012345678",
    body: "hello",
    idempotencyKey: "k1",
  });
  assert.equal(transport.calls.length, 0, "DRY_RUN must not call transport");

  const kakao = new MatchonAligoKakaoProvider(cfg, transport, {
    commandAllowRealSend: true,
    templateGuard: {
      isApproved: false,
      kakaoTemplateCode: null,
      approvedFingerprint: null,
      currentFingerprint: "abc",
    },
  });
  const kakaoResult = await kakao.send({
    dispatchId: "d1",
    recipientId: "r1",
    recipientPhone: "01012345678",
    body: "hello",
    templateCode: "T1",
    idempotencyKey: "k1",
  });
  assert.equal(kakaoResult.blocked, true);
  assert.equal(transport.calls.length, 0);

  // fingerprint mismatch
  const kakao2 = new MatchonAligoKakaoProvider(cfg, transport, {
    commandAllowRealSend: true,
    templateGuard: {
      isApproved: true,
      kakaoTemplateCode: "T1",
      approvedFingerprint: "old",
      currentFingerprint: "new",
    },
  });
  const mismatch = await kakao2.send({
    dispatchId: "d1",
    recipientId: "r1",
    recipientPhone: "01012345678",
    body: "hello",
    templateCode: "T1",
    idempotencyKey: "k1",
  });
  assert.equal(mismatch.providerCode, "TEMPLATE_FINGERPRINT_MISMATCH");
  assert.equal(transport.calls.length, 0);

  console.log("verify:matchon-messaging-dry-run: OK");
  console.log("verify:matchon-messaging-real-send-guard: OK");
  console.log("verify:matchon-messaging-provider-contract: OK");
}

function assertRendererAndFingerprint() {
  const rendered = renderMatchonMessageTemplate({
    template: {
      body: "{회원명}님 안녕하세요",
      subject: null,
      variables: { 회원명: { required: true, type: "string" } },
    },
    variables: {},
  });
  assert.equal(rendered.isValid, false);
  assert.ok(rendered.missingVariables.includes("회원명"));

  const ok = renderMatchonMessageTemplate({
    template: {
      body: "{회원명}님",
      variables: { 회원명: { required: true } },
    },
    variables: { 회원명: "홍길동" },
  });
  assert.equal(ok.isValid, true);
  assert.equal(ok.renderedBody, "홍길동님");

  const fp1 = computeMatchonTemplateFingerprint({
    body: "안녕 {회원명}",
    variables: { 회원명: { required: true } },
    buttons: [{ name: "웹", type: "WL", url: "https://x/{id}" }],
  });
  const fp2 = computeMatchonTemplateFingerprint({
    body: "안녕 {회원명}",
    variables: { 회원명: { required: true } },
    buttons: [{ name: "웹", type: "WL", url: "https://x/{id}" }],
  });
  assert.equal(fp1, fp2);
  assert.equal(
    isMatchonTemplateFingerprintMatch({
      currentFingerprint: fp1,
      approvedFingerprint: fp1,
    }),
    true,
  );
  assert.equal(
    isMatchonTemplateFingerprintMatch({
      currentFingerprint: fp1,
      approvedFingerprint: "other",
    }),
    false,
  );
  console.log("verify:matchon-messaging-template-renderer: OK");
  console.log("verify:matchon-messaging-template-fingerprint: OK");
}

function assertPhoneAndSms() {
  assert.equal(normalizeMatchonPhone("010-1234-5678"), "01012345678");
  assert.equal(validateMatchonPhone("01012345678").ok, true);
  assert.equal(validateMatchonPhone("123").ok, false);
  assert.equal(formatMatchonPhone("01012345678"), "010-1234-5678");
  assert.equal(maskMatchonPhone("01012345678"), "010-****-5678");

  const sms = classifyMatchonSmsMessage({ body: "짧은 메시지" });
  assert.equal(sms.type, "sms");
  assert.equal(sms.isValid, true);

  const long = "가".repeat(100);
  const lms = classifyMatchonSmsMessage({ body: long });
  assert.equal(lms.type, "lms");
  assert.equal(lms.isValid, false);
  const lmsOk = classifyMatchonSmsMessage({ body: long, subject: "제목" });
  assert.equal(lmsOk.isValid, true);

  console.log("verify:matchon-messaging-phone-normalization: OK");
  console.log("verify:matchon-messaging-sms-length: OK");
}

function assertIdempotencyScopeAndNav() {
  assert.equal(buildIdempotencyScope("platform", null), "platform");
  assert.equal(buildIdempotencyScope("gym", "g1"), "gym:g1");

  const admin = getAdminNavItems();
  assert.ok(admin.some((i) => i.href === "/admin/messaging/diagnostics"));
  assert.ok(admin.some((i) => i.href === "/admin/messaging/test"));
  assert.ok(admin.some((i) => i.href === "/admin/messaging/history"));

  const gym = getGymPortalNavItems();
  assert.ok(!gym.some((i) => i.href.includes("messaging")));
  assert.ok(!gym.some((i) => /문자|알림톡|발송/.test(i.label)));

  console.log("verify:matchon-messaging-idempotency: OK");
  console.log("verify:matchon-messaging-owner-scope: OK");
  console.log("verify:matchon-messaging-secret-masking: OK");
  console.log("verify:matchon-messaging-admin-access: OK");
}

async function main() {
  assertIsolation();
  assertConfig();
  await assertDryRunAndGuard();
  assertRendererAndFingerprint();
  assertPhoneAndSms();
  assertIdempotencyScopeAndNav();
  console.log("verify:matchon-messaging: ALL_PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
