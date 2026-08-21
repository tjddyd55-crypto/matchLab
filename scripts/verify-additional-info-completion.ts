/**
 * 추가정보 완료 판정·라벨
 *   npm run verify:additional-info-completion
 */
import assert from "node:assert/strict";
import {
  ADDITIONAL_INFO_STATUS_LABELS,
  additionalInfoBadgeTone,
  additionalInfoStatusLabel,
  isAdditionalInfoComplete,
} from "../src/lib/additional-info/completion.ts";
import { buildInsuranceConsentSnapshot } from "../src/lib/athlete-application/insurance-consent.ts";
import {
  PRIVACY_CONSENT_SNAPSHOT_KEY,
  buildAdditionalInfoPrivacyConsentSnapshot,
} from "../src/lib/additional-info/privacy-consent.ts";
import { previewAdditionalInfoBulkRequest } from "../src/lib/additional-info/bulk-preview.ts";

function main() {
  assert.equal(ADDITIONAL_INFO_STATUS_LABELS.NOT_REQUESTED, "미요청");
  assert.equal(ADDITIONAL_INFO_STATUS_LABELS.REQUESTED, "요청완료");
  assert.equal(ADDITIONAL_INFO_STATUS_LABELS.IN_PROGRESS, "작성중");
  assert.equal(ADDITIONAL_INFO_STATUS_LABELS.COMPLETED, "완료");
  assert.equal(ADDITIONAL_INFO_STATUS_LABELS.CONTACT_REQUIRED, "연락처 필요");

  assert.equal(
    additionalInfoStatusLabel("NOT_REQUESTED", true),
    "연락처 필요",
  );
  assert.equal(additionalInfoBadgeTone("COMPLETED", false), "green");

  const now = new Date();
  const privacy = buildAdditionalInfoPrivacyConsentSnapshot({
    agreedAt: now,
    provenance: "athlete_self",
  });
  const insurance = buildInsuranceConsentSnapshot({
    agreedAt: now,
    provenance: "athlete_self",
  });
  const agreement = { [PRIVACY_CONSENT_SNAPSHOT_KEY]: privacy };

  assert.equal(
    isAdditionalInfoComplete({
      isMinor: false,
      insuranceRrnCipher: new Uint8Array([1]),
      insuranceRrnIv: new Uint8Array([2]),
      insuranceRrnAuthTag: new Uint8Array([3]),
      participantAddress: "서울시",
      insuranceConsentSnapshot: insurance,
      applicationAgreementSnapshot: agreement,
      additionalInfoSignatureObjectKey: "additional-info/e/a/x.png",
      guardianName: null,
      additionalInfoGuardianRelation: null,
    }),
    true,
  );

  assert.equal(
    isAdditionalInfoComplete({
      isMinor: true,
      insuranceRrnCipher: new Uint8Array([1]),
      insuranceRrnIv: new Uint8Array([2]),
      insuranceRrnAuthTag: new Uint8Array([3]),
      participantAddress: "서울시",
      insuranceConsentSnapshot: insurance,
      applicationAgreementSnapshot: agreement,
      additionalInfoSignatureObjectKey: "additional-info/e/a/x.png",
      guardianName: "김보호",
      additionalInfoGuardianRelation: null,
    }),
    false,
  );

  const preview = previewAdditionalInfoBulkRequest(
    [
      {
        applicationId: "1",
        isMinor: false,
        contactMissing: false,
        additionalInfoStatus: "NOT_REQUESTED",
      },
      {
        applicationId: "2",
        isMinor: false,
        contactMissing: true,
        additionalInfoStatus: "NOT_REQUESTED",
      },
      {
        applicationId: "3",
        isMinor: false,
        contactMissing: false,
        additionalInfoStatus: "COMPLETED",
      },
    ],
    "adults",
  );
  assert.equal(preview.target, 3);
  assert.equal(preview.sendable, 1);
  assert.equal(preview.contactMissing, 1);
  assert.equal(preview.completed, 1);

  console.log("verify:additional-info-completion OK");
}

main();
