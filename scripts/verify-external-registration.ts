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

function main() {
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
