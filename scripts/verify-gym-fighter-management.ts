/**
 * Stage B: 회원사 /gym 선수관리 재사용·게이트·협회 read-only 정적 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const fighterService = read("src/lib/services/fighter.service.ts");
  assert.match(fighterService, /requireGymPortalRead/);
  assert.match(fighterService, /requireGymPortalWrite/);
  assert.match(
    fighterService,
    /listGymFighters[\s\S]*requireGymPortalRead/,
  );
  assert.match(
    fighterService,
    /createFighterDirectlyForGym[\s\S]*requireGymPortalWrite/,
  );
  assert.match(
    fighterService,
    /updateGymFighter[\s\S]*requireGymPortalWrite/,
  );
  assert.match(
    fighterService,
    /releaseGymFighterAffiliation[\s\S]*requireGymPortalWrite|requireGymPortalWrite[\s\S]*release/,
  );

  const gymFightersPage = read(
    "src/app/(dashboard)/gym/fighters/page.tsx",
  );
  assert.match(gymFightersPage, /canCreateFighter/);
  assert.match(gymFightersPage, /readOnly=\{!canUpdateFighter\}/);

  const assocFighterPage = read(
    "src/app/(dashboard)/organizer/member-gyms/[memberGymId]/fighters/[fighterId]/page.tsx",
  );
  assert.match(assocFighterPage, /requireAssociationOrganizerPage/);
  assert.match(assocFighterPage, /currentGymId:\s*member\.gymId/);
  assert.match(assocFighterPage, /읽기 전용/);
  assert.doesNotMatch(assocFighterPage, /createGymFighter|updateGymFighter|GymFighterForm/);
  assert.doesNotMatch(assocFighterPage, /"use server"/);

  const accountSection = read(
    "src/components/domain/member-gyms/MemberGymAccountSection.tsx",
  );
  assert.match(accountSection, /기존 계정 연결/);
  assert.match(accountSection, /신규 계정 초대/);

  const fightersReadonly = read(
    "src/components/domain/member-gyms/MemberGymFightersReadonlySection.tsx",
  );
  assert.match(fightersReadonly, /읽기 전용/);
  assert.doesNotMatch(fightersReadonly, /선수 등록|수정하기|삭제/);

  const schema = read("prisma/schema.prisma");
  assert.doesNotMatch(schema, /model\s+GymUser\b/);

  const listRepo = read("src/lib/repositories/member-gym.repository.ts");
  assert.match(
    listRepo,
    /fighters:\s*\{\s*where:\s*\{\s*status:\s*"active"/,
  );
  assert.match(listRepo, /_count:\s*\{\s*select:\s*\{\s*fighters:\s*true/);

  const eventsRoute = read("src/app/(dashboard)/gym/events/page.tsx");
  assert.ok(eventsRoute.length > 0, "gym events route must remain");
  const appsRoute = read("src/app/(dashboard)/gym/applications/page.tsx");
  assert.ok(appsRoute.length > 0, "gym applications route must remain");

  const home = read("src/app/(dashboard)/gym/page.tsx");
  assert.match(home, /체육관 홈/);
  assert.match(home, /신청 가능 대회|신청 가능한 대회/);
  assert.match(home, /선수 등록/);
  assert.match(home, /체육관 정보/);
  assert.doesNotMatch(home, /대회·신청 현황|신청 관리|현장 모드/);
  assert.doesNotMatch(home, /전체 선수/);
  assert.doesNotMatch(home, /비활동 선수/);

  console.log("verify:gym-fighter-management: ALL_PASS");
}

main();
