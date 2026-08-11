/**
 * External gym multi-registration — token, batch schema, entry source.
 *   npx tsx scripts/verify-external-registration.ts
 */
import assert from "node:assert/strict";
import {
  buildExternalRegistrationPublicToken,
  generateExternalRegistrationRawToken,
  hashExternalRegistrationToken,
  parseExternalRegistrationPublicToken,
  verifyExternalRegistrationPublicToken,
} from "../src/lib/external-registration/token.ts";
import {
  EXTERNAL_REGISTRATION_MAX_ATHLETES,
  externalRegistrationBatchSchema,
} from "../src/lib/validators/external-registration.validator.ts";
import {
  EXTERNAL_LINK_ENTRY_SOURCE,
  ORGANIZER_MANUAL_ENTRY_SOURCE,
  buildExternalLinkAgreementExtras,
  buildOrganizerManualAgreementExtras,
  readApplicationEntrySource,
} from "../src/lib/application-form/organizer-manual-entry.ts";
import {
  EXTERNAL_REGISTRATION_GYM_LOGIN_PREFIX,
  EXTERNAL_REGISTRATION_GYM_NAME_PREFIX,
  excludeExternalRegistrationPlaceholderGymWhere,
  isExternalRegistrationPlaceholderGymName,
  isExternalRegistrationPlaceholderOwnerLoginId,
  resolveApplicationGymDisplayName,
} from "../src/lib/gym/external-registration-placeholder-gym.ts";
import { assertDevelopmentYamanoteDatabaseUrl } from "../src/lib/db/assert-development-yamanote.ts";
import { resolveExternalRegistrationClosedReason } from "../src/lib/external-registration/eligibility.ts";
import { EventStatus } from "../src/generated/prisma/index.js";

function main() {
  const now = new Date("2026-08-11T12:00:00.000Z");
  const window = {
    registrationStartDate: new Date("2026-07-01T00:00:00.000Z"),
    registrationEndDate: new Date("2026-08-20T12:00:00.000Z"),
    now,
  };
  assert.equal(
    resolveExternalRegistrationClosedReason({
      status: EventStatus.draft,
      ...window,
    }),
    null,
    "draft + in-window must allow (Production hotfix)",
  );
  assert.equal(
    resolveExternalRegistrationClosedReason({
      status: EventStatus.open,
      ...window,
    }),
    null,
  );
  assert.ok(
    resolveExternalRegistrationClosedReason({
      status: EventStatus.cancelled,
      ...window,
    }),
  );
  assert.ok(
    resolveExternalRegistrationClosedReason({
      status: EventStatus.closed,
      ...window,
    }),
  );
  assert.ok(
    resolveExternalRegistrationClosedReason({
      status: EventStatus.finished,
      ...window,
    }),
  );
  assert.ok(
    resolveExternalRegistrationClosedReason({
      status: EventStatus.draft,
      registrationStartDate: new Date("2026-09-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-09-20T00:00:00.000Z"),
      now,
    })?.includes("시작"),
  );
  assert.ok(
    resolveExternalRegistrationClosedReason({
      status: EventStatus.draft,
      registrationStartDate: new Date("2026-07-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-08-01T00:00:00.000Z"),
      now,
    })?.includes("마감"),
  );
  console.log("verify:external-registration-eligibility OK");

  assert.equal(
    isExternalRegistrationPlaceholderOwnerLoginId("ext-reg-abc"),
    true,
  );
  assert.equal(
    isExternalRegistrationPlaceholderOwnerLoginId("gym1"),
    false,
  );
  assert.equal(
    isExternalRegistrationPlaceholderGymName("MATCHON 외부등록 (주최자)"),
    true,
  );
  assert.equal(
    resolveApplicationGymDisplayName({
      gymSnapshot: { gymId: "g1", name: "QA 외부체육관 A" },
      gymRelationName: "MATCHON 외부등록 (주최자)",
    }),
    "QA 외부체육관 A",
  );
  assert.equal(
    resolveApplicationGymDisplayName({
      gymSnapshot: null,
      gymRelationName: "MATCHON 외부등록 (주최자)",
    }),
    "—",
  );
  assert.ok(
    EXTERNAL_REGISTRATION_GYM_LOGIN_PREFIX.startsWith("ext-reg"),
  );
  assert.ok(
    EXTERNAL_REGISTRATION_GYM_NAME_PREFIX.startsWith("MATCHON"),
  );
  assert.ok(excludeExternalRegistrationPlaceholderGymWhere.NOT);
  console.log("verify:external-registration-placeholder-gym OK");

  // fail-closed helper shape only (no live DATABASE_URL required here)
  try {
    assertDevelopmentYamanoteDatabaseUrl(
      "postgresql://u:p@yamabiko.proxy.rlwy.net:1/railway",
    );
    assert.fail("yamabiko should throw");
  } catch (e) {
    assert.ok(String(e).includes("REFUSING"));
  }
  const fp = assertDevelopmentYamanoteDatabaseUrl(
    "postgresql://u:p@yamanote.proxy.rlwy.net:45288/railway",
  );
  assert.ok(fp.host.includes("yamanote"));
  console.log("verify:external-registration-db-preflight OK");

  const raw = generateExternalRegistrationRawToken();
  assert.equal(raw.length, 48);
  const hash = hashExternalRegistrationToken(raw);
  assert.equal(hash.length, 64);

  const linkId = "clxxxxxxxxxxxxxxxxxxxxxx";
  const publicToken = buildExternalRegistrationPublicToken(linkId, hash);
  const parsed = parseExternalRegistrationPublicToken(publicToken);
  assert.ok(parsed);
  assert.equal(parsed!.linkId, linkId);
  assert.ok(
    verifyExternalRegistrationPublicToken({
      linkId,
      tokenHash: hash,
      signature: parsed!.signature,
    }),
  );
  assert.equal(
    verifyExternalRegistrationPublicToken({
      linkId,
      tokenHash: hashExternalRegistrationToken("other"),
      signature: parsed!.signature,
    }),
    false,
  );
  console.log("verify:external-registration-token OK");

  const batch = externalRegistrationBatchSchema.safeParse({
    token: publicToken,
    clientSubmissionId: "00000000-0000-4000-8000-000000000001",
    gymInfo: {
      gymName: "ABC 체육관",
      contactName: "김담당",
      contactPhone: "01012345678",
    },
    athletes: [
      {
        fighterName: "김선수",
        gender: "male",
        birthDate: "2008-01-01",
        divisionId: "div1",
      },
    ],
  });
  assert.equal(batch.success, true);

  const tooMany = externalRegistrationBatchSchema.safeParse({
    token: publicToken,
    clientSubmissionId: "00000000-0000-4000-8000-000000000002",
    gymInfo: {
      gymName: "ABC",
      contactName: "김",
      contactPhone: "010",
    },
    athletes: Array.from({ length: EXTERNAL_REGISTRATION_MAX_ATHLETES + 1 }, (_, i) => ({
      fighterName: `선수${i}`,
      gender: "male",
      birthDate: "2008-01-01",
      divisionId: "div1",
    })),
  });
  assert.equal(tooMany.success, false);
  console.log("verify:external-registration-batch-schema OK");

  const manual = buildOrganizerManualAgreementExtras("user1");
  assert.equal(manual.entrySource, ORGANIZER_MANUAL_ENTRY_SOURCE);
  const ext = buildExternalLinkAgreementExtras({
    externalLinkId: "link1",
    clientSubmissionId: "sub1",
    contactName: "담당",
  });
  assert.equal(ext.entrySource, EXTERNAL_LINK_ENTRY_SOURCE);
  assert.equal(readApplicationEntrySource(manual), ORGANIZER_MANUAL_ENTRY_SOURCE);
  assert.equal(readApplicationEntrySource(ext), EXTERNAL_LINK_ENTRY_SOURCE);
  console.log("verify:external-registration-entry-source OK");

  console.log("verify:external-registration suite OK");
}

main();
