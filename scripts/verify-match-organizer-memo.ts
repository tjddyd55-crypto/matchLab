/**
 * Match 경기별 주최자 운영 메모 SSOT
 *   npm run verify:match-organizer-memo
 */
import assert from "node:assert/strict";
import {
  MATCH_ORGANIZER_MEMO_MAX_LENGTH,
  normalizeMatchOrganizerMemo,
  validateMatchOrganizerMemo,
} from "../src/lib/brackets/match-organizer-memo";

function main() {
  assert.equal(normalizeMatchOrganizerMemo(null), null);
  assert.equal(normalizeMatchOrganizerMemo(""), null);
  assert.equal(normalizeMatchOrganizerMemo("   "), null);
  assert.equal(
    normalizeMatchOrganizerMemo("체급 차이 있으나 양측 협의 후 매칭"),
    "체급 차이 있으나 양측 협의 후 매칭",
  );

  const long = "가".repeat(MATCH_ORGANIZER_MEMO_MAX_LENGTH + 10);
  assert.equal(
    normalizeMatchOrganizerMemo(long)?.length,
    MATCH_ORGANIZER_MEMO_MAX_LENGTH,
  );

  assert.deepEqual(validateMatchOrganizerMemo(""), { ok: true, value: null });
  assert.deepEqual(validateMatchOrganizerMemo("  "), { ok: true, value: null });
  assert.deepEqual(validateMatchOrganizerMemo("협의 완료"), {
    ok: true,
    value: "협의 완료",
  });

  const tooLong = validateMatchOrganizerMemo("가".repeat(501));
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) {
    assert.match(tooLong.message, /500/);
  }

  console.log("verify:match-organizer-memo OK");
}

main();
