/**
 * Gym member self-registration — token, validation, minor, signature, duplicate, approval, idempotency.
 *
 *   npx tsx scripts/verify-gym-member-self-registration.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildGymMemberSelfRegistrationPublicToken,
  generateGymMemberSelfRegistrationRawToken,
  hashGymMemberSelfRegistrationToken,
  parseGymMemberSelfRegistrationPublicToken,
  verifyGymMemberSelfRegistrationPublicToken,
} from "../src/lib/gym-member-self-registration/token.ts";
import {
  checkGymMemberSelfRegistrationRateLimit,
  resetGymMemberSelfRegistrationRateLimitForTests,
} from "../src/lib/gym-member-self-registration/rate-limit.ts";
import { selfRegistrationSubmitSchema } from "../src/lib/gym-member-self-registration/validation.ts";
import { isMinorBirthDate } from "../src/lib/gym-member-self-registration/age.ts";
import { healthSnapshotHasYes } from "../src/lib/gym-member-self-registration/types.ts";
import { EMPTY_HEALTH_SNAPSHOT } from "../src/lib/gym-member-self-registration/types.ts";
import { parseDateOnlyString } from "../src/lib/date-only.ts";

function healthAllNo() {
  return {
    currentCondition: { answer: false, detail: "" },
    medicationOrDisease: { answer: false, detail: "" },
    exerciseCaution: { answer: false, detail: "" },
    recentSurgeryOrHospital: { answer: false, detail: "" },
  };
}

function verifyToken() {
  const raw = generateGymMemberSelfRegistrationRawToken();
  const hash = hashGymMemberSelfRegistrationToken(raw);
  const linkId = "clxxxxxxxxxxxxxxxxxxxxxx";
  const token = buildGymMemberSelfRegistrationPublicToken(linkId, hash);
  const parsed = parseGymMemberSelfRegistrationPublicToken(token);
  assert.ok(parsed);
  assert.equal(parsed.linkId, linkId);
  assert.equal(
    verifyGymMemberSelfRegistrationPublicToken({
      linkId,
      tokenHash: hash,
      signature: parsed.signature,
    }),
    true,
  );
  assert.equal(
    verifyGymMemberSelfRegistrationPublicToken({
      linkId,
      tokenHash: hashGymMemberSelfRegistrationToken("other"),
      signature: parsed.signature,
    }),
    false,
  );
  console.log("verify:member-self-registration-token OK");
}

function verifyScope() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /model GymMemberSelfRegistrationLink/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(schema, /model GymMemberRegistrationRequest/);
  assert.match(schema, /approvedGymMemberId/);
  assert.match(schema, /clientSubmissionId/);
  const service = readFileSync(
    "src/lib/services/gym-member-self-registration.service.ts",
    "utf8",
  );
  assert.match(service, /gymMemberService\.createMember/);
  assert.doesNotMatch(service, /createFighter|registerAsFighter:\s*true/);
  assert.doesNotMatch(service, /GymMemberPayment|createPayment/);
  console.log("verify:member-self-registration-scope OK");
}

function verifyValidation() {
  const adult = selfRegistrationSubmitSchema.safeParse({
    token: "a".repeat(20) + "." + "b".repeat(32),
    clientSubmissionId: "client-1-xxxxxxxx",
    name: "홍길동",
    gender: "남",
    birthDate: "1990-01-01",
    phone: "01012345678",
    health: healthAllNo(),
    privacyAgreed: true,
    termsAgreed: true,
  });
  assert.equal(adult.success, true);

  const missingHealth = selfRegistrationSubmitSchema.safeParse({
    token: "a".repeat(20) + "." + "b".repeat(32),
    clientSubmissionId: "client-2-xxxxxxxx",
    name: "홍길동",
    gender: "남",
    birthDate: "1990-01-01",
    phone: "01012345678",
    health: EMPTY_HEALTH_SNAPSHOT,
    privacyAgreed: true,
    termsAgreed: true,
  });
  assert.equal(missingHealth.success, false);
  console.log("verify:member-self-registration-validation OK");
}

function verifyMinor() {
  const birth = parseDateOnlyString("2015-05-01")!;
  assert.equal(isMinorBirthDate(birth, new Date("2026-08-13")), true);
  const missingGuardian = selfRegistrationSubmitSchema.safeParse({
    token: "a".repeat(20) + "." + "b".repeat(32),
    clientSubmissionId: "client-3-xxxxxxxx",
    name: "김미소",
    gender: "여",
    birthDate: "2015-05-01",
    phone: "01011112222",
    health: healthAllNo(),
    privacyAgreed: true,
    termsAgreed: true,
  });
  assert.equal(missingGuardian.success, false);

  const withGuardian = selfRegistrationSubmitSchema.safeParse({
    token: "a".repeat(20) + "." + "b".repeat(32),
    clientSubmissionId: "client-4-xxxxxxxx",
    name: "김미소",
    gender: "여",
    birthDate: "2015-05-01",
    phone: "01011112222",
    guardianName: "김보호",
    guardianPhone: "01099998888",
    guardianConsentAgreed: true,
    health: healthAllNo(),
    privacyAgreed: true,
    termsAgreed: true,
  });
  assert.equal(withGuardian.success, true);
  console.log("verify:member-self-registration-minor OK");
}

function verifySignature() {
  const pad = readFileSync("src/components/shared/SignaturePad.tsx", "utf8");
  assert.match(pad, /isEmpty/);
  assert.match(pad, /touch-none/);
  assert.match(pad, /pointerdown|onPointerDown/);
  const form = readFileSync(
    "src/components/domain/gym-member-self-registration/GymMemberSelfRegistrationPublicForm.tsx",
    "utf8",
  );
  assert.match(form, /isEmpty\(\)/);
  assert.match(form, /memberSignature/);
  assert.match(form, /guardianSignature/);
  const sigService = readFileSync(
    "src/lib/services/gym-member-self-registration-signature.service.ts",
    "utf8",
  );
  assert.match(sigService, /uploadPrivateObjectBytes/);
  assert.doesNotMatch(sigService, /base64.*db|prisma\.\w+.*base64/i);
  console.log("verify:member-self-registration-signature OK");
}

function verifyDuplicate() {
  const service = readFileSync(
    "src/lib/services/gym-member-self-registration.service.ts",
    "utf8",
  );
  assert.match(service, /findDuplicateCandidates/);
  assert.match(service, /confirmDuplicate/);
  const detail = readFileSync(
    "src/app/(dashboard)/gym/members/registrations/[requestId]/page.tsx",
    "utf8",
  );
  assert.match(detail, /이미 등록된 회원/);
  console.log("verify:member-self-registration-duplicate OK");
}

function verifyApproval() {
  const service = readFileSync(
    "src/lib/services/gym-member-self-registration.service.ts",
    "utf8",
  );
  assert.match(service, /GymMemberRegistrationRequestStatus\.approved/);
  assert.match(service, /approvedGymMember/);
  assert.match(service, /gymMemberService\.createMember/);
  assert.match(service, /registerAsFighter:\s*false/);
  console.log("verify:member-self-registration-approval OK");
}

function verifyIdempotency() {
  const service = readFileSync(
    "src/lib/services/gym-member-self-registration.service.ts",
    "utf8",
  );
  assert.match(service, /clientSubmissionId/);
  assert.match(service, /findRequestByClientSubmission/);
  resetGymMemberSelfRegistrationRateLimitForTests();
  const first = checkGymMemberSelfRegistrationRateLimit({
    tokenHashPrefix: "abc",
    ip: "1.1.1.1",
  });
  assert.equal(first.ok, true);
  console.log("verify:member-self-registration-idempotency OK");
}

function verifyHealthBadge() {
  assert.equal(healthSnapshotHasYes(healthAllNo()), false);
  assert.equal(
    healthSnapshotHasYes({
      ...healthAllNo(),
      currentCondition: { answer: true, detail: "천식" },
    }),
    true,
  );
}

function main() {
  verifyToken();
  verifyScope();
  verifyValidation();
  verifyMinor();
  verifySignature();
  verifyDuplicate();
  verifyApproval();
  verifyIdempotency();
  verifyHealthBadge();
}

main();
