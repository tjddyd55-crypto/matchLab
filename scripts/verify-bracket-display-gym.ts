/**
 * Bracket / application gym display — snapshot over MATCHON placeholder relation.
 *   npm run verify:bracket-display-gym
 */
import assert from "node:assert/strict";
import { resolveApplicationGymDisplayName } from "../src/lib/gym/external-registration-placeholder-gym.ts";

function main() {
  assert.equal(
    resolveApplicationGymDisplayName({
      gymSnapshot: { gymId: "g1", name: "실제 외부체육관" },
      gymRelationName: "MATCHON 외부등록 (주최자)",
    }),
    "실제 외부체육관",
    "gymSnapshot must win over MATCHON placeholder relation name",
  );

  assert.equal(
    resolveApplicationGymDisplayName({
      gymSnapshot: { name: "  스냅샷 체육관  " },
      gymRelationName: "일반 체육관",
    }),
    "스냅샷 체육관",
    "trimmed gymSnapshot name is preferred even when relation is valid",
  );

  assert.equal(
    resolveApplicationGymDisplayName({
      gymSnapshot: null,
      gymRelationName: "MATCHON 외부등록 (주최자)",
    }),
    "—",
    "placeholder relation alone must not be shown",
  );

  assert.equal(
    resolveApplicationGymDisplayName({
      gymSnapshot: {},
      gymRelationName: "정상 체육관",
    }),
    "정상 체육관",
    "empty snapshot object falls back to non-placeholder relation",
  );

  console.log("verify:bracket-display-gym OK");
}

main();
