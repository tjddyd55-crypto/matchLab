/**
 * Legacy organizerMemo kg → BracketMatch.matchWeightKg backfill.
 * Development yamanote only. Idempotent. Never overwrites existing weight.
 * Never mutates organizerMemo text.
 *
 *   npx tsx scripts/backfill-match-weight-from-memo.mts
 *   npx tsx scripts/backfill-match-weight-from-memo.mts --apply
 *   npx tsx scripts/backfill-match-weight-from-memo.mts --privacy-audit
 */
import { execSync } from "node:child_process";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const apply = process.argv.includes("--apply");
const privacyAudit = process.argv.includes("--privacy-audit");

const MEMO_WEIGHT_RE = /(\d+(?:\.\d+)?)\s*kg\b/i;

function extractMatchWeightKgFromMemo(
  memo: string | null | undefined,
): number | null {
  if (memo == null) return null;
  const text = String(memo).trim();
  if (!text) return null;
  const m = text.match(MEMO_WEIGHT_RE);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertYamanote(databaseUrl: string) {
  const host = databaseUrl.match(/@([^/]+)\//)?.[1] ?? "unknown";
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(`REFUSING: expected yamanote, got host=${host}`);
  }
  return host;
}

/** 전화/주민번호 등 PDF 노출 위험 휴리스틱 (샘플 감사) */
function detectSensitiveHints(memo: string): string[] {
  const hints: string[] = [];
  if (/(?:0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4})/.test(memo)) {
    hints.push("phone-like");
  }
  if (/\d{6}\s*[-–]?\s*[1-4]\d{6}/.test(memo)) {
    hints.push("rrn-like");
  }
  if (/(보호자|연락처|핸드폰|휴대폰|주민)/.test(memo)) {
    hints.push("pii-keyword");
  }
  return hints;
}

async function main() {
  const pgVars = railwayJson("Postgres");
  const databaseUrl = String(
    pgVars.DATABASE_PUBLIC_URL || pgVars.DATABASE_URL || "",
  );
  if (!databaseUrl) throw new Error("DATABASE_URL missing from Railway Postgres");
  const host = assertYamanote(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;

  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows = await prisma.bracketMatch.findMany({
      select: {
        id: true,
        organizerMemo: true,
        matchWeightKg: true,
      },
    });

    const total = rows.length;
    const alreadyHasWeight = rows.filter((r) => r.matchWeightKg != null).length;
    const nullWeight = rows.filter((r) => r.matchWeightKg == null);
    const withMemo = rows.filter(
      (r) => (r.organizerMemo ?? "").trim().length > 0,
    );

    type Candidate = {
      id: string;
      kg: number;
      memo: string;
    };
    const candidates: Candidate[] = [];
    const memoNoKg: string[] = [];
    const samples: Array<{ id: string; kg: number; memo: string }> = [];

    for (const r of nullWeight) {
      const memo = r.organizerMemo ?? "";
      const kg = extractMatchWeightKgFromMemo(memo);
      if (kg == null) {
        if (memo.trim()) memoNoKg.push(memo.slice(0, 80));
        continue;
      }
      candidates.push({ id: r.id, kg, memo });
      if (samples.length < 12) {
        samples.push({ id: r.id, kg, memo: memo.slice(0, 120) });
      }
    }

    let wouldOverwriteIfForced = 0;
    for (const r of rows) {
      if (r.matchWeightKg == null) continue;
      const extracted = extractMatchWeightKgFromMemo(r.organizerMemo);
      if (extracted != null && extracted !== r.matchWeightKg) {
        wouldOverwriteIfForced += 1;
      }
    }

    console.log("=== matchWeightKg backfill (yamanote) ===");
    console.log(`host: ${host}`);
    console.log(`mode: ${apply ? "APPLY" : "DRY-RUN"}`);
    console.log(`total Match: ${total}`);
    console.log(`matchWeightKg null: ${nullWeight.length}`);
    console.log(`already has weight: ${alreadyHasWeight}`);
    console.log(`memo non-empty: ${withMemo.length}`);
    console.log(
      `backfill candidates (null + extractable kg): ${candidates.length}`,
    );
    console.log(`kg 없는 memo (null weight): ${memoNoKg.length}`);
    console.log(
      `rows with weight≠memo-kg (overwrite skipped forever): ${wouldOverwriteIfForced}`,
    );
    console.log("samples:");
    for (const s of samples) {
      console.log(`  ${s.kg}kg ← ${JSON.stringify(s.memo)}`);
    }

    if (privacyAudit || !apply) {
      const sensitive: Array<{ hints: string[]; memo: string }> = [];
      for (const r of withMemo) {
        const memo = (r.organizerMemo ?? "").trim();
        const hints = detectSensitiveHints(memo);
        if (hints.length === 0) continue;
        if (sensitive.length < 20) {
          sensitive.push({ hints, memo: memo.slice(0, 100) });
        }
      }
      console.log("\n=== privacy audit (organizerMemo) ===");
      console.log(
        `memos with sensitive hints (capped sample): ${sensitive.length}`,
      );
      for (const s of sensitive) {
        console.log(`  [${s.hints.join(",")}] ${JSON.stringify(s.memo)}`);
      }
      const phoneHits = withMemo.filter((r) =>
        detectSensitiveHints(r.organizerMemo ?? "").includes("phone-like"),
      ).length;
      const rrnHits = withMemo.filter((r) =>
        detectSensitiveHints(r.organizerMemo ?? "").includes("rrn-like"),
      ).length;
      console.log(`phone-like count: ${phoneHits}`);
      console.log(`rrn-like count: ${rrnHits}`);
      console.log(
        phoneHits + rrnHits === 0
          ? "policy: organizerMemo → PDF printableMemo OK (no PII hits in audit)"
          : "policy: consider printableMemo field — PII hints found",
      );
    }

    if (!apply) {
      console.log("\nDRY-RUN complete. Re-run with --apply to write.");
      return;
    }

    let updated = 0;
    let skipped = 0;
    for (const c of candidates) {
      const result = await prisma.bracketMatch.updateMany({
        where: { id: c.id, matchWeightKg: null },
        data: { matchWeightKg: c.kg },
      });
      if (result.count === 1) updated += 1;
      else skipped += 1;
    }

    console.log("\n=== APPLY result ===");
    console.log(`updated: ${updated}`);
    console.log(`skipped (race/already set): ${skipped}`);
    console.log(`overwrite count: 0 (guarded)`);

    const again = await prisma.bracketMatch.findMany({
      where: { matchWeightKg: null },
      select: { id: true, organizerMemo: true },
    });
    let remaining = 0;
    for (const r of again) {
      if (extractMatchWeightKgFromMemo(r.organizerMemo) != null) remaining += 1;
    }
    console.log(`remaining extractable nulls: ${remaining}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
