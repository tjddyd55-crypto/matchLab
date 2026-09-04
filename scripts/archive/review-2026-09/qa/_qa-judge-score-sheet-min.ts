/**
 * Minimal Judge Score Sheet QA — DEV yamanote READ ONLY.
 *   npx tsx scripts/_qa-judge-score-sheet-min.ts
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import {
  buildJudgeScoreSheetPages,
  isJudgeScoreSheetEligibleMatch,
} from "../src/lib/judge-score-sheet/format";
import {
  formatCourtScheduleMatchOrderShort,
  sortMatchesByCourtSchedule,
} from "../src/lib/court-match-order";
import {
  formatDivisionMainLabel,
  toEventDivisionDisplayInput,
} from "../src/lib/event-division-fields";
import { parseBracketFighterSnapshot } from "../src/lib/bracket-snapshot";

function railwayDevPgVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function main() {
  const pgVars = railwayDevPgVars();
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  if (!/yamanote/i.test(dbUrl)) throw new Error("expected yamanote");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const beforeApp = await prisma.eventApplication.count();
  const beforeMatch = await prisma.bracketMatch.count();

  const events = await prisma.event.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  let best: {
    eventId: string;
    title: string;
    matches: Array<{
      matchNumber: number | null;
      matchNoLabel: string;
      venueName: string | null;
      divisionLabel: string | null;
      red: string;
      redGym: string;
      blue: string;
      blueGym: string;
    }>;
  } | null = null;

  for (const ev of events) {
    const [rows, courts] = await Promise.all([
      prisma.bracketMatch.findMany({
        where: { bracket: { eventId: ev.id } },
        include: {
          court: { select: { id: true, name: true } },
          fighterRed: { select: { name: true } },
          fighterBlue: { select: { name: true } },
          bracket: {
            select: {
              division: {
                select: {
                  sportType: true,
                  ruleType: true,
                  gender: true,
                  ageGroup: true,
                  weightClass: true,
                  weightClassName: true,
                  weightLimitText: true,
                  skillLevel: true,
                },
              },
            },
          },
        },
      }),
      prisma.eventCourt.findMany({
        where: { eventId: ev.id, isActive: true },
        select: { id: true, sortOrder: true },
      }),
    ]);

    const ordered = sortMatchesByCourtSchedule(
      rows.map((m) => ({
        ...m,
        matchId: m.id,
        courtId: m.courtId ?? null,
        courtOrder: m.courtOrder ?? null,
      })),
      courts,
    );

    const eligible = ordered.filter((m) =>
      isJudgeScoreSheetEligibleMatch({
        status: m.status,
        fighterRedId: m.fighterRedId,
        fighterBlueId: m.fighterBlueId,
      }),
    );
    if (eligible.length < 5) continue;

    const matches = eligible.map((m) => {
      const redSnap = parseBracketFighterSnapshot(m.fighterRedSnapshot);
      const blueSnap = parseBracketFighterSnapshot(m.fighterBlueSnapshot);
      const div = m.bracket.division
        ? formatDivisionMainLabel(
            toEventDivisionDisplayInput(m.bracket.division),
          )
        : null;
      return {
        matchNumber: m.matchNumber,
        matchNoLabel: formatCourtScheduleMatchOrderShort({
          matchId: m.id,
          courtId: m.courtId,
          courtOrder: m.courtOrder,
          matchNumber: m.matchNumber,
          globalMatchOrder: m.globalMatchOrder,
          matchOrder: m.matchOrder,
        }),
        venueName: m.court?.name?.trim() || null,
        divisionLabel: div,
        red: redSnap?.name?.trim() || m.fighterRed?.name?.trim() || "—",
        redGym: redSnap?.gymName?.trim() || "—",
        blue: blueSnap?.name?.trim() || m.fighterBlue?.name?.trim() || "—",
        blueGym: blueSnap?.gymName?.trim() || "—",
      };
    });

    best = { eventId: ev.id, title: ev.title, matches };
    break;
  }

  if (!best) {
    console.log("FAIL no event with >=5 eligible matches");
    process.exit(1);
  }

  const n = best.matches.length;
  const dtoMatches = best.matches.map((m, i) => ({
    matchId: `m${i}`,
    matchNumber: m.matchNumber,
    matchNoLabel: m.matchNoLabel,
    venueName: m.venueName,
    venueId: null,
    divisionLabel: m.divisionLabel,
    roundCount: 3,
    red: { name: m.red, gymName: m.redGym },
    blue: { name: m.blue, gymName: m.blueGym },
  }));

  const pages1 = buildJudgeScoreSheetPages(dtoMatches, [1]);
  const pages2 = buildJudgeScoreSheetPages(dtoMatches, [2]);
  const pages3 = buildJudgeScoreSheetPages(dtoMatches, [3]);
  const pagesAll = buildJudgeScoreSheetPages(dtoMatches, [1, 2, 3]);

  const sample = best.matches.slice(0, 5);
  console.log(
    JSON.stringify(
      {
        eventId: best.eventId,
        title: best.title,
        matchCount: n,
        page1: pages1.length,
        page2: pages2.length,
        page3: pages3.length,
        combined: pagesAll.length,
        pageMathOk:
          pages1.length === n &&
          pages2.length === n &&
          pages3.length === n &&
          pagesAll.length === 3 * n,
        sample5: sample,
        renumberSafe: sample.every((m) =>
          m.matchNumber == null
            ? true
            : m.matchNoLabel.includes(String(m.matchNumber)),
        ),
      },
      null,
      2,
    ),
  );

  const afterApp = await prisma.eventApplication.count();
  const afterMatch = await prisma.bracketMatch.count();
  console.log(
    "delta",
    JSON.stringify({
      app: afterApp - beforeApp,
      match: afterMatch - beforeMatch,
    }),
  );

  if (
    pages1.length !== n ||
    pages2.length !== n ||
    pages3.length !== n ||
    pagesAll.length !== 3 * n
  ) {
    process.exit(1);
  }
  if (afterApp !== beforeApp || afterMatch !== beforeMatch) process.exit(1);

  await prisma.$disconnect();
  await pool.end();
  console.log("QA PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
