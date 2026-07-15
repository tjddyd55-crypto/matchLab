/**
 * Contact/email display SSOT (no DB).
 *   npx tsx scripts/verify-member-gym-contact-mapping.ts
 */
import assert from "node:assert/strict";
import {
  isInternalPlaceholderEmail,
  resolveMemberGymOwnerDisplay,
} from "../src/lib/member-gym/owner-account";
import {
  formatBusinessRegistrationNumber,
  formatPhoneNumber,
  normalizeBusinessRegistrationNumber,
  normalizePhoneDigits,
} from "../src/lib/phone";

function main() {
  assert.equal(isInternalPlaceholderEmail("manual-gym-abc@internal.invalid"), true);
  assert.equal(isInternalPlaceholderEmail("real@example.com"), false);

  const display = resolveMemberGymOwnerDisplay({
    owner: {
      name: "체육관A",
      email: "manual-gym-x@internal.invalid",
      phone: null,
      loginId: "manual-gym-x",
      authUserId: null,
    },
    gymName: "체육관A",
    gymPhone: "0311234567",
    application: {
      ownerName: "박성용",
      email: "applicant@example.com",
      phone: "01012345678",
    },
  });

  assert.equal(display.displayName, "박성용");
  assert.equal(display.displayEmail, "applicant@example.com");
  assert.equal(display.displayPhone, "01012345678");
  assert.equal(display.inviteDefaults.email, "applicant@example.com");
  assert.equal(display.inviteDefaults.phone, "01012345678");
  assert.notEqual(display.displayEmail.includes("internal.invalid"), true);

  assert.equal(formatPhoneNumber("01012345678"), "010-1234-5678");
  assert.equal(formatPhoneNumber("021234567"), "02-123-4567");
  assert.equal(formatPhoneNumber("0212345678"), "02-1234-5678");
  assert.equal(formatPhoneNumber("0311234567"), "031-123-4567");
  assert.equal(formatPhoneNumber("15881234"), "1588-1234");
  assert.equal(normalizePhoneDigits("010-1234-5678"), "01012345678");
  assert.equal(
    formatBusinessRegistrationNumber("1234567890"),
    "123-45-67890",
  );
  assert.equal(
    normalizeBusinessRegistrationNumber("123-45-67890"),
    "1234567890",
  );

  console.log("verify:member-gym-contact-mapping: OK");
}

main();
