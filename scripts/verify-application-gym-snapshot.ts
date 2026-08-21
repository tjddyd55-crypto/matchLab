/**
 * Application gym snapshot SSOT
 *   npm run verify:application-gym-snapshot
 */
import assert from "node:assert/strict";
import {
  buildApplicationGymSnapshot,
  getApplicationGymDisplayName,
  resolveApplicationGymDisplayName,
} from "../src/lib/gym/external-registration-placeholder-gym.ts";

function main() {
  const snap = buildApplicationGymSnapshot({
    gymId: null,
    gymDisplayName: "QA FIGHT GYM",
  });
  assert.equal(snap.gymId, null);
  assert.equal(snap.name, "QA FIGHT GYM");

  assert.equal(
    resolveApplicationGymDisplayName({
      gymNameSnapshot: "T-MAC 종합격투기",
      gymSnapshot: { gymId: null, name: "ignored" },
      gymRelationName: "MATCHON 외부등록 (테스트)",
    }),
    "T-MAC 종합격투기",
  );

  assert.equal(
    getApplicationGymDisplayName({
      gymSnapshot: { name: "산본더원" },
      gymRelationName: "MATCHON 외부등록 (테스트)",
    }),
    "산본더원",
  );

  assert.equal(
    resolveApplicationGymDisplayName({
      gymSnapshot: { name: "MATCHON 외부등록 (테스트)" },
      gymRelationName: "MATCHON 외부등록 (테스트)",
    }),
    "—",
  );

  assert.equal(
    resolveApplicationGymDisplayName({
      gymSnapshot: {},
      gymRelationName: "더원체육관",
    }),
    "더원체육관",
  );

  console.log("verify:application-gym-snapshot OK");
}

main();
