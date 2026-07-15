/**
 * Signature pad helpers + attachment type label presence (no DB).
 *   npx tsx scripts/verify-member-gym-signature.ts
 */
import assert from "node:assert/strict";
import { MEMBER_GYM_ATTACHMENT_TYPE_LABEL } from "../src/lib/ui-labels/member-gym";

function main() {
  assert.equal(
    MEMBER_GYM_ATTACHMENT_TYPE_LABEL.applicant_signature,
    "신청인 손서명",
  );
  console.log("verify:member-gym-signature: OK");
}

main();
