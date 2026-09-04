/**
 * Gym Member UI + Fighter Integration Phase — static verify
 *
 *   npm run verify:gym-member-fighter-integration
 *
 * Asserts: explicit registration only, duplicate prevention, career SSOT,
 * snapshot immutability (no EventApplication/BracketMatch writes from promote),
 * overview IA (no independent fighter tab).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const listPage = read("src/app/(dashboard)/gym/members/page.tsx");
  assert.match(listPage, /MemberCompactStatsStrip/);
  assert.doesNotMatch(listPage, /MemberMetricCard/);
  assert.doesNotMatch(listPage, />업무</);
  assert.match(listPage, /더보기/);
  assert.match(listPage, /MemberExcelDownloadButton/);
  assert.match(listPage, /MemberExcelImportButton/);
  assert.match(listPage, /GymMemberSelfRegistrationLinkButton/);
  assert.match(listPage, /그룹 관리/);
  assert.match(listPage, /이용권 관리/);

  const tabs = read("src/components/domain/gym-members/MemberDetailTabs.tsx");
  assert.doesNotMatch(tabs, /선수정보/);
  assert.doesNotMatch(tabs, /"fighter"/);
  assert.match(tabs, /overview/);
  assert.match(tabs, /membership/);

  const detail = read("src/app/(dashboard)/gym/members/[memberId]/page.tsx");
  assert.match(detail, /GymMemberFighterOverviewSection/);
  assert.match(detail, /← 회원 목록/);
  assert.match(detail, /loadCareerBreakdown/);
  assert.doesNotMatch(detail, /tab === "fighter"/);
  assert.match(detail, /GymMemberOpsActionBar/);
  assert.match(detail, /이용권 등록/);

  const overview = read(
    "src/components/domain/gym-members/GymMemberFighterOverviewSection.tsx",
  );
  assert.match(overview, /선수로 등록/);
  assert.match(overview, /MATCHON 공식 전적/);
  assert.match(overview, /외부 전적/);
  assert.match(overview, /통합 표시 전적/);
  assert.match(overview, /formatOfficialRecordSummary/);
  assert.match(overview, /커리어 보기/);

  const dialog = read(
    "src/components/domain/gym-members/GymMemberPromoteFighterDialog.tsx",
  );
  assert.match(dialog, /promoteGymMemberToFighterAction/);
  assert.match(dialog, /createLoginAccount/);
  assert.match(dialog, /["']false["']/);
  assert.doesNotMatch(dialog, /recordWin|externalRecordWin/);
  assert.match(dialog, /주 종목/);
  assert.match(dialog, /신장/);

  const actions = read(
    "src/components/domain/gym-members/GymMemberDetailActions.tsx",
  );
  assert.doesNotMatch(actions, /promoteGymMemberToFighterAction/);

  const promoteSvc = read("src/lib/services/gym-member.service.ts");
  const promoteBlock = promoteSvc.slice(
    promoteSvc.indexOf("async promoteToFighter"),
    promoteSvc.indexOf("async linkExistingFighter"),
  );
  assert.match(promoteBlock, /이미 선수로 등록된 회원/);
  assert.match(promoteBlock, /gymMemberId:\s*member\.id/);
  assert.doesNotMatch(promoteBlock, /eventApplication|bracketMatch|MatchResult/i);
  assert.doesNotMatch(promoteBlock, /recordWin\s*:/);
  assert.doesNotMatch(promoteBlock, /externalRecordWin\s*:/);

  const promoteAction = read("src/features/gym-members/actions.ts");
  assert.match(promoteAction, /promoteGymMemberToFighterAction/);
  assert.match(promoteAction, /gymMemberPromoteFighterSchema/);

  const careerSvc = read(
    "src/lib/services/fighter-unified-profile.service.ts",
  );
  assert.match(careerSvc, /computeOfficialRecordFromResults/);
  assert.match(careerSvc, /buildExternalRecordFromFighter/);
  assert.match(careerSvc, /computeCombinedRecord/);
  assert.match(careerSvc, /loadCareerBreakdown/);

  const opsBar = read(
    "src/components/domain/gym-members/GymMemberOpsActionBar.tsx",
  );
  assert.match(opsBar, /이용권 등록/);
  assert.match(opsBar, /결제/);
  assert.match(opsBar, /출석 처리/);
  assert.doesNotMatch(opsBar, /선수 정보/);

  console.log("verify:gym-member-fighter-integration OK");
}

main();
