/**
 * 외부등록이 Gym/User를 생성하지 않음 (정적)
 *   npm run verify:external-registration-no-gym-create
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/application.service.ts"),
    "utf8",
  );

  // createExternal / excel 경로에서 ensureOrganizerExternalRegistrationGym 호출 금지
  const externalIdx = service.indexOf("createExternalLinkBatchApplications");
  const excelIdx = service.indexOf("commitOrganizerApplicantExcel");
  assert.ok(externalIdx > 0);
  assert.ok(excelIdx > 0);

  const externalSlice = service.slice(externalIdx, excelIdx);
  assert.equal(
    externalSlice.includes("ensureOrganizerExternalRegistrationGym"),
    false,
    "external registration must not create placeholder Gym",
  );

  const excelSlice = service.slice(excelIdx);
  assert.equal(
    excelSlice.includes("ensureOrganizerExternalRegistrationGym"),
    false,
    "excel import must not create placeholder Gym",
  );

  assert.match(externalSlice, /gymId:\s*null/);
  assert.match(excelSlice, /gymId:\s*null/);
  assert.match(externalSlice, /currentGymId:\s*null/);
  assert.match(excelSlice, /currentGymId:\s*null/);

  // 주최자 manual affiliation-only
  assert.match(service, /affiliationOnly/);
  assert.equal(
    service.includes("findOrCreateGymForOrganizerManualEntry"),
    false,
    "organizer manual must not create Gym account for affiliation name",
  );

  console.log("verify:external-registration-no-gym-create OK");
}

main();
