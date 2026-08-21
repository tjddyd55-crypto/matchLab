/**
 * 추가정보 보안 — plaintext RRN 로그/raw token 필드/URL path 검증
 *   npm run verify:additional-info-security
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkTs(p, acc);
    else if (name.name.endsWith(".ts") || name.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /additionalInfoTokenHash/);
  assert.doesNotMatch(schema, /additionalInfoRawToken|additionalInfoToken\s+String/);
  assert.match(schema, /insuranceRrnCipher/);
  assert.doesNotMatch(
    schema,
    /insuranceRrn\s+String|residentRegistrationNumber\s+String/,
  );

  const token = read("src/lib/additional-info/token.ts");
  assert.match(token, /\/application-info\//);
  assert.match(token, /sha256/i);

  const svc = read("src/lib/services/additional-info.service.ts");
  assert.doesNotMatch(svc, /console\.(log|info|debug|warn).*rrn/i);
  assert.doesNotMatch(svc, /console\.(log|info|debug).*phone/i);
  assert.doesNotMatch(svc, /additionalInfoRawToken/);
  assert.match(svc, /allowRealSend:\s*false/);

  const files = walkTs("src/lib/additional-info").concat([
    "src/lib/services/additional-info.service.ts",
    "src/features/additional-info/actions.ts",
  ]);
  for (const f of files) {
    const src = read(f);
    assert.doesNotMatch(
      src,
      /console\.(log|info|debug)\([^)]*resident/i,
      `${f} must not log resident number`,
    );
  }

  const page = read(
    "src/app/(public)/application-info/[token]/page.tsx",
  );
  assert.match(page, /ApplicationInfoPage|추가정보/);
  assert.doesNotMatch(page, /searchParams.*rrn|phone=/i);

  const tokenUtil = read("src/lib/additional-info/token.ts");
  assert.match(tokenUtil, /\/application-info\//);

  console.log("verify:additional-info-security OK");
}

main();
