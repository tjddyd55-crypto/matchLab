/**
 * 대진 검증 — 복수 출전 검출 / confirmation signature
 *   npm run verify:bracket-duplicate-validation
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildMultiMatchAssignmentSignature,
  isMultiMatchConfirmationValid,
} from "../src/lib/brackets/bracket-duplicate-validation";

const root = path.resolve(__dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function main() {
  const service = read("src/lib/services/bracket.service.ts");
  const actions = read("src/features/brackets/actions.ts");
  const ui = read(
    "src/components/domain/brackets/OrganizerBracketsGenerateActions.tsx",
  );
  const dialog = read(
    "src/components/domain/brackets/BracketDuplicateValidationDialog.tsx",
  );
  const schema = read("prisma/schema.prisma");

  assert.match(service, /listEventDuplicateAssignmentIssues/);
  assert.match(service, /confirmEventMultiMatch/);
  assert.match(service, /clearEventMultiMatchConfirmation/);
  assert.match(service, /clearMultiMatchConfirmationByFighterIds/);
  assert.match(actions, /listEventBracketDuplicateValidationAction/);
  assert.match(actions, /confirmEventMultiMatchAction/);
  assert.match(ui, /대진 검증/);
  assert.match(dialog, /의도된 복수 출전으로 확인/);
  assert.match(schema, /multiMatchConfirmedSignature/);
  assert.match(schema, /multiMatchConfirmedAt/);

  const sig2 = buildMultiMatchAssignmentSignature(["m2", "m1"]);
  assert.equal(sig2, "m1|m2");

  assert.equal(
    isMultiMatchConfirmationValid({
      currentMatchIds: ["m1", "m2"],
      confirmedSignature: sig2,
    }),
    true,
  );

  // 3경기 추가 → invalid
  assert.equal(
    isMultiMatchConfirmationValid({
      currentMatchIds: ["m1", "m2", "m3"],
      confirmedSignature: sig2,
    }),
    false,
  );

  // 1경기만 → invalid
  assert.equal(
    isMultiMatchConfirmationValid({
      currentMatchIds: ["m1"],
      confirmedSignature: sig2,
    }),
    false,
  );

  assert.equal(
    isMultiMatchConfirmationValid({
      currentMatchIds: ["m1", "m2"],
      confirmedSignature: null,
    }),
    false,
  );

  console.log("verify:bracket-duplicate-validation OK");
}

main();
