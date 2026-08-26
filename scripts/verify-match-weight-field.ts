/**
 * Match.matchWeightKg 정식 필드 + helpers + UI wiring
 *   npm run verify:match-weight-field
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatMatchWeightKgInputValue,
  formatMatchWeightKgLabel,
  parseMatchWeightKgInput,
  resolveMatchWeightKgValue,
  resolveMatchWeightLabel,
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

  assert.equal(
    resolveMatchWeightLabel({ matchWeightKg: 70, organizerMemo: "68kg" }),
    "70kg",
  );
  assert.equal(
    resolveMatchWeightLabel({ matchWeightKg: null, organizerMemo: "68kg / 결승" }),
    "68kg",
  );
  assert.equal(
    resolveMatchWeightKgValue({ matchWeightKg: null, organizerMemo: "42.5kg" }),
    42.5,
  );

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
  assert.match(card, /resolveMatchWeightKgValue/);
  assert.match(input, /aria-label="경기 체중"/);
  assert.match(input, /\bkg\b/);
  assert.match(layout, /matchWeightInputClass/);
  assert.match(layout, /w-\[4\.75rem\]/);
  assert.match(actions, /parseMatchWeightKgInput/);
  assert.match(actions, /matchWeightKg/);

  console.log("verify:match-weight-field OK");
}

main();
