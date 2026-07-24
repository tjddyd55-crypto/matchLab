/**
 * 메인 파트너 로고 격리·관리 SSOT 검증.
 *   npm run verify:public-partner-logo-management
 *   npm run verify:public-partner-logo-isolation
 *   npm run verify:public-partner-logo-visibility
 *   npm run verify:organizer-logo-regression
 *   npm run verify:public-home-partner-grid
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computePublicPartnerLogoStatus,
  isPublicPartnerVisibleOnHome,
  parsePublicPartnerType,
} from "../src/lib/public-partner-logo";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertIsolation() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model PublicPartner/);
  assert.match(schema, /enum PublicPartnerType/);
  assert.match(schema, /association/);
  assert.match(schema, /brand/);
  assert.match(schema, /openInNewTab/);
  assert.match(schema, /description/);
  assert.match(
    read("scripts/sql/add-public-partner-schema-additive.sql"),
    /ADD VALUE IF NOT EXISTS 'brand'/,
  );
  assert.doesNotMatch(
    read("scripts/sql/add-public-partner-schema-additive.sql"),
    /DROP\s+|TRUNCATE\s+|SET\s+NOT\s+NULL/i,
  );

  const svc = read("src/lib/services/public-partner.service.ts");
  assert.match(svc, /listActivePublicPartnerLogos/);
  assert.doesNotMatch(svc, /publicLogoVisible/);
  assert.doesNotMatch(svc, /OrganizerType\.association/);
  assert.doesNotMatch(svc, /prisma\.organizer\.findMany/);

  const admin = read("src/lib/services/admin-public-partner.service.ts");
  assert.match(admin, /requireRole\(actor, \[UserRole\.admin\]\)/);
  assert.match(admin, /assertPublicPartnerLogoPath/);

  const approve = read("src/lib/services/association-application.service.ts");
  assert.match(approve, /publicLogoVisible:\s*false/);
  assert.doesNotMatch(approve, /publicPartner\.create/);

  const home = read(
    "src/components/domain/events/public/PublicHomePartnersSection.tsx",
  );
  assert.match(home, /함께하는 파트너/);
  assert.doesNotMatch(home, /협회 및 파트너/);

  const assocForm = read(
    "src/components/domain/organizer/AssociationPublicLogoForm.tsx",
  );
  assert.match(assocForm, /메인 하단 파트너/);
  assert.doesNotMatch(assocForm, /공개 홈에 로고 노출/);

  console.log("verify:public-partner-logo-isolation: OK");
}

function assertVisibility() {
  const now = new Date("2026-07-24T12:00:00.000Z");
  assert.equal(
    computePublicPartnerLogoStatus(
      {
        isActive: true,
        startsAt: null,
        endsAt: null,
      },
      now,
    ),
    "active",
  );
  assert.equal(
    computePublicPartnerLogoStatus(
      {
        isActive: false,
        startsAt: null,
        endsAt: null,
      },
      now,
    ),
    "inactive",
  );
  assert.equal(
    computePublicPartnerLogoStatus(
      {
        isActive: true,
        startsAt: new Date("2026-08-01T00:00:00.000Z"),
        endsAt: null,
      },
      now,
    ),
    "scheduled",
  );
  assert.equal(
    computePublicPartnerLogoStatus(
      {
        isActive: true,
        startsAt: null,
        endsAt: new Date("2026-07-01T00:00:00.000Z"),
      },
      now,
    ),
    "ended",
  );
  assert.equal(
    isPublicPartnerVisibleOnHome(
      {
        isActive: true,
        startsAt: null,
        endsAt: new Date("2026-07-24T00:00:00.000Z"),
        logoUrl: "https://example.com/a.png",
      },
      now,
    ),
    true,
  );
  assert.equal(
    isPublicPartnerVisibleOnHome(
      {
        isActive: true,
        deletedAt: new Date(),
        startsAt: null,
        endsAt: null,
        logoUrl: "https://example.com/a.png",
      },
      now,
    ),
    false,
  );
  assert.equal(parsePublicPartnerType("brand"), "brand");
  assert.equal(parsePublicPartnerType("nope"), "partner");
  console.log("verify:public-partner-logo-visibility: OK");
}

function assertAdminAccess() {
  const actions = read("src/features/public-partners/actions.ts");
  assert.match(actions, /revalidatePath\("\/"\)/);
  assert.match(actions, /adminPublicPartnerService/);

  const nav = read("src/lib/navigation/admin-navigation.ts");
  assert.match(nav, /\/admin\/public-partners/);
  assert.match(nav, /메인 파트너 로고/);

  const upload = read("src/lib/services/public-partner-upload.ts");
  assert.match(upload, /public-partners\//);
  assert.match(upload, /organizers\//);

  const api = read("src/app/api/public/home-partners/route.ts");
  assert.equal(api.includes("logoPath"), false);
  assert.match(api, /logoUrl/);

  console.log("verify:public-partner-logo-admin-access: OK");
}

function assertOrganizerRegression() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /logoPath\s+String\?/);
  assert.match(schema, /logoUrl\s+String\?/);
  assert.match(schema, /publicLogoVisible/);

  const orgSvc = read("src/lib/services/organizer-public-logo.service.ts");
  assert.match(orgSvc, /assertOrganizerPublicLogoPath/);
  assert.match(orgSvc, /update\(/);

  const join = read("src/lib/services/public-join.service.ts");
  assert.match(join, /logoUrl/);

  console.log("verify:organizer-logo-regression: OK");
}

function assertHomeGrid() {
  const grid = read(
    "src/components/domain/events/public/PublicPartnerLogoGrid.tsx",
  );
  assert.match(grid, /object-contain/);
  assert.match(grid, /PublicPartnerLogoItem/);

  const homePage = read("src/app/(public)/page.tsx");
  assert.match(homePage, /PublicHomePartnersSection/);
  assert.match(homePage, /listActivePublicPartnerLogos/);

  console.log("verify:public-home-partner-grid: OK");
}

function main() {
  assertIsolation();
  assertVisibility();
  assertAdminAccess();
  assertOrganizerRegression();
  assertHomeGrid();
  console.log("verify:public-partner-logo-management: ALL_PASS");
}

main();
