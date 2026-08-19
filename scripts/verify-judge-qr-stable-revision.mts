import { createHmac, timingSafeEqual } from "node:crypto";

const STABLE_COURT_REVISION = "0";
const eventId = "cmpba6v1l000eqcux4kfmg49y";
const courtId = "cmqfsqfhp000j0po9hryb2s41";

function entrySecret(): string {
  return (
    process.env.JUDGE_QR_ENTRY_SECRET?.trim() ||
    process.env.JUDGE_SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "dev-judge-qr-entry-secret"
  );
}

function signPayload(encoded: string): string {
  return createHmac("sha256", entrySecret()).update(encoded).digest("base64url");
}

function createToken(payload: {
  eventId: string;
  courtId: string;
  target: "score" | "head";
  courtRevision: string;
}): string {
  const body = {
    eventId: payload.eventId.trim(),
    courtId: payload.courtId.trim(),
    target: payload.target,
    courtRevision: payload.courtRevision.trim(),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${signPayload(encoded)}`;
}

function parseToken(token: string) {
  const raw = token.trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = signPayload(encoded);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
}

function assert(name: string, ok: boolean) {
  if (!ok) {
    console.error(`FAIL: ${name}`);
    process.exit(1);
  }
  console.log(`OK: ${name}`);
}

const isoToken = createToken({
  eventId,
  courtId,
  target: "score",
  courtRevision: "2026-06-16T21:40:59.544Z",
});

const stableToken = createToken({
  eventId,
  courtId,
  target: "score",
  courtRevision: STABLE_COURT_REVISION,
});

const headStableToken = createToken({
  eventId,
  courtId,
  target: "head",
  courtRevision: STABLE_COURT_REVISION,
});

assert("ISO courtRevision token parses", parseToken(isoToken) !== null);
assert("stable courtRevision token parses", parseToken(stableToken) !== null);
assert("invalid token rejected", parseToken("invalid.token") === null);
assert("tampered token rejected", parseToken(`${isoToken}x`) === null);

const isoPayload = parseToken(isoToken);
assert(
  "ISO payload fields match",
  isoPayload?.eventId === eventId &&
    isoPayload?.courtId === courtId &&
    isoPayload?.target === "score",
);

const stablePayload = parseToken(stableToken);
assert(
  "stable payload uses revision 0",
  stablePayload?.courtRevision === STABLE_COURT_REVISION,
);

assert(
  "ISO and stable tokens differ (different revision in payload)",
  isoToken !== stableToken,
);

console.log("\nToken-layer checks passed.");
console.log("score ISO:", isoToken.slice(0, 40) + "...");
console.log("score stable:", stableToken.slice(0, 40) + "...");
console.log("head stable:", headStableToken.slice(0, 40) + "...");

export { isoToken, stableToken, headStableToken, eventId, courtId };
