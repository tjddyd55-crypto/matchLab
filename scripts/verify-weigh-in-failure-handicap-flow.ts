/**
 * 계체 실패 후 핸디캡 진행 흐름 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { computeFieldEligibility } from "../src/lib/field-eligibility";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const passPending = computeFieldEligibility({
  checkInStatus: "pending",
  weighInStatus: "pass",
});
assert.equal(passPending.isEligibleForBracket, true);
assert.equal(passPending.eligibilityLabel, "출전 확정");

const failHandicap = computeFieldEligibility({
  checkInStatus: "pending",
  weighInStatus: "fail",
  weighInFailureResolution: "proceed_with_handicap",
});
assert.equal(failHandicap.isEligibleForBracket, true);
assert.equal(failHandicap.eligibilityLabel, "핸디캡 경기");

const failCancel = computeFieldEligibility({
  checkInStatus: "pending",
  weighInStatus: "fail",
  weighInFailureResolution: "cancel_match",
});
assert.equal(failCancel.isEligibleForBracket, false);

const noShow = computeFieldEligibility({
  checkInStatus: "no_show",
  weighInStatus: "pass",
});
assert.equal(noShow.isEligibleForBracket, false);

const form = read(
  "src/components/domain/field-status/WeighInFailureResolutionForm.tsx",
);
assert.ok(form.includes("proceed_with_handicap"));
assert.ok(form.includes("cancel_match"));
assert.ok(form.includes("미출석"));

const detail = read(
  "src/components/domain/field-status/OrganizerFieldStatusDetailPane.tsx",
);
assert.ok(detail.includes("핸디캡 경기"));

console.log("verify:weigh-in-failure-handicap-flow: OK");
