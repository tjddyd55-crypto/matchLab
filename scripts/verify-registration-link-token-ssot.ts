/**
 * Public registration link HMAC create/verify SSOT
 *   npm run verify:registration-link-token-ssot
 *
 * 별도 HMAC 재구현 금지 — src/lib/external-registration/token.ts 만 사용.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  buildExternalRegistrationPublicToken,
  createRegistrationPublicToken,
  parseExternalRegistrationPublicToken,
  verifyExternalRegistrationPublicToken,
  verifyRegistrationPublicToken,
} from "../src/lib/external-registration/token.ts";

function main() {
  process.env.EXTERNAL_REGISTRATION_URL_SECRET =
    process.env.EXTERNAL_REGISTRATION_URL_SECRET ||
    "verify-registration-link-token-ssot-secret";

  const linkId = "clxxxxxxxxxxxxxxxxxxxxxxxxx";
  const raw = "aabbccddeeff00112233445566778899aabbccdd";
  const tokenHash = createHash("sha256").update(raw, "utf8").digest("hex");

  const built = buildExternalRegistrationPublicToken(linkId, tokenHash);
  const alias = createRegistrationPublicToken(linkId, tokenHash);
  assert.equal(built, alias);

  const parsed = parseExternalRegistrationPublicToken(built);
  assert.ok(parsed);
  assert.equal(parsed!.linkId, linkId);
  assert.equal(
    verifyExternalRegistrationPublicToken({
      linkId: parsed!.linkId,
      tokenHash,
      signature: parsed!.signature,
    }),
    true,
  );
  assert.equal(
    verifyRegistrationPublicToken({
      linkId: parsed!.linkId,
      tokenHash,
      signature: parsed!.signature,
    }),
    true,
  );

  // encodeURIComponent round-trip (URL path)
  const encoded = encodeURIComponent(built);
  const decoded = decodeURIComponent(encoded);
  const parsed2 = parseExternalRegistrationPublicToken(decoded);
  assert.ok(parsed2);
  assert.equal(
    verifyExternalRegistrationPublicToken({
      linkId: parsed2!.linkId,
      tokenHash,
      signature: parsed2!.signature,
    }),
    true,
  );

  // wrong secret → mismatch
  const prev = process.env.EXTERNAL_REGISTRATION_URL_SECRET;
  process.env.EXTERNAL_REGISTRATION_URL_SECRET = "other-secret";
  const otherBuilt = buildExternalRegistrationPublicToken(linkId, tokenHash);
  process.env.EXTERNAL_REGISTRATION_URL_SECRET = prev;
  assert.notEqual(otherBuilt, built);
  const otherParsed = parseExternalRegistrationPublicToken(otherBuilt)!;
  assert.equal(
    verifyExternalRegistrationPublicToken({
      linkId: otherParsed.linkId,
      tokenHash,
      signature: otherParsed.signature,
    }),
    false,
  );

  console.log("verify:registration-link-token-ssot OK");
}

main();
