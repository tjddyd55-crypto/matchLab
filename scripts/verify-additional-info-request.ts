/**
 * 추가정보 요청 — 토큰·메시지·서비스 발송 경로
 *   npm run verify:additional-info-request
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAdditionalInfoPublicUrl,
  generateAdditionalInfoRawToken,
  hashAdditionalInfoToken,
} from "../src/lib/additional-info/token.ts";
import {
  buildAdultAdditionalInfoMessage,
  buildMinorAdditionalInfoMessage,
} from "../src/lib/additional-info/messages.ts";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

function main() {
  const raw = generateAdditionalInfoRawToken();
  assert.ok(raw.length >= 32);
  const hash = hashAdditionalInfoToken(raw);
  assert.equal(hash.length, 64);
  assert.notEqual(raw, hash);
  assert.equal(hashAdditionalInfoToken(raw), hash);

  const url = buildAdditionalInfoPublicUrl(raw);
  assert.match(url, /\/application-info\//);
  assert.ok(url.includes(encodeURIComponent(raw)) || url.includes(raw));

  const adult = buildAdultAdditionalInfoMessage({
    eventTitle: "테스트대회",
    fighterName: "홍길동",
    linkUrl: url,
  });
  assert.match(adult, /MATCHON/);
  assert.match(adult, /홍길동/);
  assert.ok(adult.includes(url));

  const minor = buildMinorAdditionalInfoMessage({
    eventTitle: "테스트대회",
    fighterName: "김미성",
    linkUrl: url,
  });
  assert.match(minor, /보호자/);
  assert.match(minor, /김미성/);

  const svc = read("src/lib/services/additional-info.service.ts");
  assert.match(svc, /allowRealSend:\s*false/);
  assert.match(svc, /kakao_alimtalk/);
  assert.match(svc, /additionalInfoTokenHash/);
  assert.doesNotMatch(svc, /additionalInfoRawToken/);
  // rawToken 지역변수는 URL 발급용으로만 허용 — DB 필드명 금지

  console.log("verify:additional-info-request OK");
}

main();
