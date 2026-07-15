/**
 * Invite accept client state contract (static assertions).
 * Hang regression: must not call router.refresh() on invite page after success.
 *   npx tsx scripts/verify-gym-owner-invite-activation.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const formPath = join(
    process.cwd(),
    "src/components/domain/member-gyms/MemberGymOwnerInviteAcceptForm.tsx",
  );
  const src = readFileSync(formPath, "utf8");
  assert.equal(src.includes("router.refresh()"), false, "must not refresh invite page after accept");
  assert.equal(src.includes("window.location.assign"), true);
  assert.equal(src.includes('"submitting"'), true);
  assert.equal(src.includes('"success"'), true);
  assert.equal(src.includes('"error"'), true);
  assert.equal(src.includes("finally"), false);
  assert.equal(src.includes("passwordConfirm"), true);
  assert.equal(src.includes('activated: "1"'), true);
  assert.equal(src.includes("중복확인"), true);
  assert.equal(src.includes("loginIdReady"), true);
  console.log("verify:gym-owner-invite-activation: OK");
}

main();
