/**
 * 파트너 로고 관리·공개 SSOT 검증.
 *   npm run verify:public-partner-logo-management
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.ok(schema.includes("model PublicPartner"));
  assert.ok(schema.includes("enum PublicPartnerType"));
  assert.ok(schema.includes("publicLogoVisible"));
  assert.equal(schema.includes("model AssociationApplication"), false);

  const svc = read("src/lib/services/public-partner.service.ts");
  assert.ok(svc.includes("listHomePartners"));
  assert.ok(svc.includes("협회(이름순) 먼저"));

  const upload = read("src/lib/services/public-partner-upload.ts");
  assert.ok(upload.includes("public-partners/"));
  assert.ok(upload.includes("organizers/"));
  assert.ok(upload.includes("/public-logo/"));

  const admin = read("src/lib/services/admin-public-partner.service.ts");
  assert.ok(admin.includes("assertPublicPartnerLogoPath"));

  const api = read("src/app/api/public/home-partners/route.ts");
  assert.equal(api.includes("logoPath"), false);
  assert.ok(api.includes("logoUrl"));

  const nav = read("src/lib/navigation/admin-navigation.ts");
  assert.ok(nav.includes("/admin/public-partners"));
  assert.equal(nav.includes("/admin/association-applications"), false);

  const home = read("src/app/(public)/page.tsx");
  assert.ok(home.includes("PublicHomePartnersSection"));

  console.log("verify:public-partner-logo-management: OK");
}

main();
