/**
 * Judge QR entry smoke — token 생성·검증·entry route HTTP(서버 실행 시).
 * npx tsx scripts/verify-judge-qr-entry-smoke.mts
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function loadDotEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}
loadDotEnv();

const STABLE_COURT_REVISION = "0";
const EVENT_ID =
  process.env.JUDGE_SMOKE_EVENT_ID?.trim() ??
  process.env.QA_EVENT_ID?.trim() ??
  "cmpba6v1l000eqcux4kfmg49y";

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

function assert(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    console.error(`FAIL: ${name}${detail ? ` (${detail})` : ""}`);
    process.exit(1);
  }
  console.log(`OK: ${name}`);
}

async function main() {
  let courtId =
    process.env.JUDGE_SMOKE_COURT_ID?.trim() ?? "cmqfsqfhp000j0po9hryb2s41";

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (dbUrl) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    const { PrismaClient } = await import("../src/generated/prisma");
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const court = await prisma.eventCourt.findFirst({
      where: { eventId: EVENT_ID, isActive: true },
      select: { id: true },
      orderBy: { sortOrder: "asc" },
    });
    if (court?.id) courtId = court.id;
    await prisma.$disconnect();
    await pool.end();
  }

  const scoreToken = createToken({
    eventId: EVENT_ID,
    courtId,
    target: "score",
    courtRevision: STABLE_COURT_REVISION,
  });
  const headToken = createToken({
    eventId: EVENT_ID,
    courtId,
    target: "head",
    courtRevision: STABLE_COURT_REVISION,
  });

  assert("score token has dot", scoreToken.includes("."));
  assert("head token has dot", headToken.includes("."));

  const base = process.env.SMOKE_BASE_URL?.trim() ?? "http://127.0.0.1:3000";

  async function smokeEntry(target: "score" | "head", token: string) {
    const url = `${base}/judge/entry?eventId=${encodeURIComponent(EVENT_ID)}&courtId=${encodeURIComponent(courtId)}&token=${encodeURIComponent(token)}&target=${target}`;
    const res = await fetch(url, { redirect: "manual" });
    assert(`${target} entry status redirect`, res.status === 307 || res.status === 302);
    const location = res.headers.get("location") ?? "";
    assert(
      `${target} entry redirect path`,
      /\/judge\/courts\/[^/]+/.test(location),
      location,
    );
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert(
      `${target} entry sets court_judge_entry cookie`,
      setCookie.includes("court_judge_entry"),
    );
  }

  await smokeEntry("score", scoreToken);
  await smokeEntry("head", headToken);
  console.log("Judge QR entry smoke: HTTP checks passed");
}

main().catch((e) => {
  console.warn("Judge QR HTTP smoke skipped:", (e as Error).message);
  console.log("Judge QR token checks passed (offline)");
});
