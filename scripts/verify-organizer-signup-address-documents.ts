/**
 * 협회 가입 주소 검색·postalCode 검증 (commit1).
 * Document upload 검증은 후속 커밋에서 확장한다.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const field = read("src/components/shared/AddressSearchField.tsx");
  assert.match(field, /"use client"/);
  assert.match(field, /daumcdn\.net\/mapjsapi\/bundle\/postcode/);
  assert.match(field, /strategy="lazyOnload"/);
  assert.match(field, /readOnly=\{!scriptFailed\}/);
  assert.match(field, /detailRef\.current\?\.focus/);

  const form = read(
    "src/components/domain/association-applications/AssociationApplicationForm.tsx",
  );
  assert.match(form, /AddressSearchField/);
  assert.match(form, /postalName="postalCode"/);

  const helper = read("src/lib/postal-address.ts");
  assert.match(helper, /formatPostalAddress/);
  assert.match(helper, /normalizePostalCode/);

  const schema = read("prisma/schema.prisma");
  assert.match(
    schema,
    /model AssociationApplication[\s\S]*?postalCode\s+String\?/,
  );

  const sqlBody = read(
    "scripts/sql/add-association-application-postal-code-additive.sql",
  )
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  assert.match(sqlBody, /ADD COLUMN IF NOT EXISTS "postalCode"/);
  assert.doesNotMatch(sqlBody, /DROP\s+|SET\s+NOT\s+NULL|TRUNCATE/i);

  const svc = read("src/lib/services/association-application.service.ts");
  assert.match(svc, /postalCode: normalizePostalCode/);

  const admin = read(
    "src/app/(dashboard)/admin/association-applications/[applicationId]/page.tsx",
  );
  assert.match(admin, /formatPostalAddress/);

  console.log("verify:organizer-signup-address-search: OK");
  console.log("verify:organizer-signup-address-storage: OK");
  console.log("verify:organizer-signup-address: ALL_PASS");
}

main();
