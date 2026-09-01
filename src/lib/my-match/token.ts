import { createHmac, timingSafeEqual } from "node:crypto";

const SIG_HEX_LEN = 32;

type MyMatchTokenPayload = {
  eventSlug: string;
  fighterId: string;
};

export function getMyMatchSigningSecret(): string {
  const secret =
    process.env.MY_MATCH_URL_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MY_MATCH_URL_SECRET 또는 AUTH_SECRET이 필요합니다.");
    }
    return "dev-my-match-url-secret";
  }
  return secret;
}

function signPayload(encoded: string): string {
  return createHmac("sha256", getMyMatchSigningSecret())
    .update(`my-match:${encoded}`, "utf8")
    .digest("hex")
    .slice(0, SIG_HEX_LEN);
}

export function buildMyMatchToken(payload: MyMatchTokenPayload): string {
  const body: MyMatchTokenPayload = {
    eventSlug: payload.eventSlug.trim(),
    fighterId: payload.fighterId.trim(),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${signPayload(encoded)}`;
}

export function parseMyMatchToken(token: string): MyMatchTokenPayload | null {
  const raw = token.trim();
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const dot = decoded.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = decoded.slice(0, dot);
  const signature = decoded.slice(dot + 1);
  if (!encoded || signature.length !== SIG_HEX_LEN) return null;
  if (!/^[a-f0-9]+$/i.test(signature)) return null;

  const expected = signPayload(encoded);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<MyMatchTokenPayload>;
    if (
      typeof parsed.eventSlug !== "string" ||
      !parsed.eventSlug.trim() ||
      typeof parsed.fighterId !== "string" ||
      !parsed.fighterId.trim()
    ) {
      return null;
    }
    return {
      eventSlug: parsed.eventSlug.trim(),
      fighterId: parsed.fighterId.trim(),
    };
  } catch {
    return null;
  }
}
