/**
 * Match.matchWeightKg 정식 필드 + UI wiring (runtime SSOT, no memo fallback)
 *   npm run verify:match-weight-field
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatMatchWeightKgInputValue,
  formatMatchWeightKgLabel,
  parseMatchWeightKgInput,
} from "../src/lib/brackets/extract-match-weight-from-memo";

const root = process.cwd();

function main() {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  assert.match(schema, /matchWeightKg\s+Float\?/);

  assert.equal(formatMatchWeightKgLabel(68), "68kg");
  assert.equal(formatMatchWeightKgLabel(42.5), "42.5kg");
  assert.equal(formatMatchWeightKgLabel(60.0), "60kg");
  assert.equal(formatMatchWeightKgLabel(null), null);

  assert.equal(formatMatchWeightKgInputValue(68), "68");
  assert.equal(formatMatchWeightKgInputValue(42.5), "42.5");
  assert.deepEqual(parseMatchWeightKgInput("68"), { ok: true, value: 68 });
  assert.deepEqual(parseMatchWeightKgInput("42.5"), { ok: true, value: 42.5 });
  assert.deepEqual(parseMatchWeightKgInput(""), { ok: true, value: null });
  assert.equal(parseMatchWeightKgInput("68kg").ok, true);
  assert.equal(parseMatchWeightKgInput("abc").ok, false);

  // null field must not invent weight from memo formatter alone
  assert.equal(formatMatchWeightKgLabel(null), null);

  const card = readFileSync(
    join(root, "src/components/domain/brackets/OrganizerMatchEditCard.tsx"),
    "utf8",
  );
  const input = readFileSync(
    join(root, "src/components/domain/brackets/MatchWeightKgInput.tsx"),
    "utf8",
  );
  const layout = readFileSync(
    join(root, "src/lib/ui/match-grid-layout.ts"),
    "utf8",
  );
  const actions = readFileSync(
    join(root, "src/features/event-courts/actions.ts"),
    "utf8",
  );

  assert.match(card, /MatchWeightKgInput/);
  assert.match(card, /leadingExtra/);
  assert.match(card, /match\.matchWeightKg/);
  assert.doesNotMatch(card, /resolveMatchWeightKgValue/);
  assert.doesNotMatch(card, /extractMatchWeight/);
  assert.match(input, /aria-label="경기 체중"/);
  assert.match(input, /\bkg\b/);
  assert.match(layout, /matchWeightInputClass/);
  assert.match(layout, /w-\[4\.75rem\]/);
  assert.match(actions, /parseMatchWeightKgInput/);
  assert.match(actions, /matchWeightKg/);

  console.log("verify:match-weight-field OK");
}

main();
