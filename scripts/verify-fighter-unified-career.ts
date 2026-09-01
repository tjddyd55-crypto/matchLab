/**
 * Unified fighter career SSOT verification
 *   npx tsx scripts/verify-fighter-unified-career.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MatchRecordOutcome } from "../src/generated/prisma";
import {
  computeOfficialRecordFromResults,
  formatOfficialRecordSummary,
} from "../src/lib/fighter-unified-profile/official-record";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function main() {
  const service = read("src/lib/services/fighter-unified-profile.service.ts");
  assert.match(service, /resultRepository\.listResultsByFighter/);
  assert.match(service, /computeOfficialRecordFromResults/);
  assert.match(service, /loadForGym/);
  assert.match(service, /loadForAssociation/);
  assert.match(service, /loadForAdmin/);
  assert.match(service, /externalRecord/);
  assert.match(service, /combinedRecord/);
  assert.match(service, /loadForFighter/);

  const associationPage = read(
    "src/app/(dashboard)/organizer/member-gyms/[memberGymId]/fighters/[fighterId]/page.tsx",
  );
  assert.match(associationPage, /fighterUnifiedProfileService/);
  assert.doesNotMatch(associationPage, /fighter\.phone/);

  const adminPage = read("src/app/(dashboard)/admin/fighters/[fighterId]/page.tsx");
  assert.match(adminPage, /FighterUnifiedCareerPanel/);
  assert.doesNotMatch(adminPage, /AdminFighterCareerView profile/);

  const gymPage = read("src/app/(dashboard)/gym/fighters/[fighterId]/edit/page.tsx");
  assert.match(gymPage, /FighterExternalRecordForm/);
  assert.match(gymPage, /FighterUnifiedCareerPanel/);

  // confirmed win + loss + draw + no_contest
  const record = computeOfficialRecordFromResults([
    { result: MatchRecordOutcome.win },
    { result: MatchRecordOutcome.loss },
    { result: MatchRecordOutcome.draw },
    { result: MatchRecordOutcome.no_contest },
  ]);
  assert.equal(record.wins, 1);
  assert.equal(record.losses, 1);
  assert.equal(record.draws, 1);
  assert.equal(record.noContests, 1);
  assert.equal(record.bouts, 3);
  assert.equal(record.totalMatches, 4);

  const empty = computeOfficialRecordFromResults([]);
  assert.equal(empty.bouts, 0);
  assert.equal(empty.totalMatches, 0);

  const summary = formatOfficialRecordSummary(record);
  assert.match(summary, /1승/);
  assert.match(summary, /1NC/);

  const resultRepo = read("src/lib/repositories/result.repository.ts");
  assert.match(resultRepo, /PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES/);
  assert.match(resultRepo, /no_contest/);

  const identity = read("src/lib/services/fighter-unified-profile.service.ts");
  assert.match(identity, /showContact = viewerRole === "gym" \|\| viewerRole === "admin"/);

  console.log("verify-fighter-unified-career: PASS");
}

main();
