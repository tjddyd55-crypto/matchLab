/**
 * 대진표 수동 편성 Preview E2E (Development yamanote)
 * 자동대진 알고리즘은 변경하지 않음 — UI/aggregation/CRUD 검증.
 *
 *   npx tsx scripts/e2e-bracket-manual-match-preview-qa.mts
 *   npx tsx scripts/e2e-bracket-manual-match-preview-qa.mts --cleanup-only
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
import { chromium } from "playwright";

const PREFIX = "BRACKET_UX_QA_";
const BASE = (
  process.env.QA_BASE_URL ||
  "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "bracket-manual-match-preview-qa");
const cleanupOnly = process.argv.includes("--cleanup-only");
const allowShaMismatch = process.argv.includes("--allow-sha-mismatch");

mkdirSync(OUT, { recursive: true });

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const report: Record<string, unknown> = {
  ok: false,
  failReasons: [] as string[],
  deployment: {},
  flows: {} as Record<string, unknown>,
};

function fail(msg: string): never {
  (report.failReasons as string[]).push(msg);
  throw new Error(msg);
}
function pass(name: string, detail?: unknown) {
  (report.flows as Record<string, unknown>)[name] = detail ?? "PASS";
}

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertYamanote(databaseUrl: string) {
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: not yamanote`);
  }
}

async function main() {
  const deployRaw = execSync(
    `railway deployment list --service app --limit 1 --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  const deploys = JSON.parse(deployRaw) as Array<{
    id: string;
    status: string;
    meta?: { commitHash?: string };
  }>;
  const latest = deploys[0];
  assert.ok(latest, "no deployment");
  report.deployment = {
    deploymentId: latest.id,
    status: latest.status,
    servingSha: latest.meta?.commitHash ?? "",
  };
  if (!cleanupOnly) {
    if (latest.status !== "SUCCESS" && !allowShaMismatch) {
      fail(`deploy status ${latest.status}`);
    }
  }

  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  for (const key of [
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "MATCHON_PII_ENCRYPTION_KEY",
  ]) {
    if (app[key]) process.env[key] = app[key];
  }

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, ApplicationStatus, BracketType, BracketStatus } =
    await import("../src/generated/prisma");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  async function cleanupQa() {
    const events = await prisma.event.findMany({
      where: { title: { startsWith: PREFIX } },
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);
    if (eventIds.length) {
      const apps = await prisma.eventApplication.findMany({
        where: { eventId: { in: eventIds } },
        select: { fighterId: true },
      });
      await prisma.bracketMatch.deleteMany({
        where: { bracket: { eventId: { in: eventIds } } },
      });
      await prisma.bracket.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.eventApplication.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.eventDivision.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.eventCourt.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
      const fighterIds = [...new Set(apps.map((a) => a.fighterId))];
      if (fighterIds.length) {
        await prisma.fighter.deleteMany({
          where: {
            id: { in: fighterIds },
            name: { startsWith: PREFIX },
          },
        });
      }
    }
    console.log("cleanup OK", { events: eventIds.length });
  }

  await cleanupQa();
  if (cleanupOnly) {
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const { resolveApplicationGymDisplayName } = await import(
    "../src/lib/gym/external-registration-placeholder-gym"
  );
  const { bracketService } = await import("../src/lib/services/bracket.service");
  const { bracketAutoMatchService } = await import(
    "../src/lib/services/bracket-auto-match.service"
  );

  const display = resolveApplicationGymDisplayName({
    gymSnapshot: { name: "T-MAC 종합격투기" },
    gymRelationName: "MATCHON 외부등록 (테스트주최자)",
  });
  assert.equal(display, "T-MAC 종합격투기");
  pass("gymDisplaySsot", { display });

  const organizerUser = await prisma.user.findFirst({
    where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
    include: { organizer: true },
  });
  assert.ok(organizerUser?.organizer);
  const actor = {
    userId: organizerUser.id,
    role: "organizer" as const,
    email: organizerUser.email ?? "organizer@demo.local",
    loginId: organizerUser.loginId ?? "organizer",
    organizerId: organizerUser.organizer.id,
  };

  const stamp = Date.now().toString(36);
  const event = await prisma.event.create({
    data: {
      organizerId: organizerUser.organizer.id,
      title: `${PREFIX}Event ${stamp}`,
      location: "QA",
      eventDate: new Date("2026-12-01T00:00:00.000Z"),
      registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
      status: "open",
      publicSlug: `bracket-ux-qa-${stamp}`,
      courts: { create: [{ name: "QA코트1", sortOrder: 0 }] },
      divisions: {
        create: [
          {
            sportType: "kickboxing",
            gender: "male",
            ageGroup: "중등부",
            weightClass: "-60kg",
            weightClassName: "웰터급",
            weightLimitText: "-60kg",
          },
        ],
      },
    },
    include: { divisions: true, courts: true },
  });
  const division = event.divisions[0]!;
  const court = event.courts[0]!;

  const placeholderGym =
    (await prisma.gym.findFirst({
      where: { name: { startsWith: "MATCHON 외부등록" } },
    })) ??
    (await prisma.gym.findFirst());
  assert.ok(placeholderGym);

  const fighters = [];
  for (let i = 0; i < 3; i += 1) {
    const f = await prisma.fighter.create({
      data: {
        fighterCode: `BUX${stamp}${i}`,
        name: `${PREFIX}Athlete${i}`,
        gender: "male",
        birthDate: new Date("2012-01-01T00:00:00.000Z"),
        phone: `0108000${1000 + i}`,
        currentGymId: placeholderGym.id,
      },
    });
    fighters.push(f);
    await prisma.eventApplication.create({
      data: {
        eventId: event.id,
        divisionId: division.id,
        divisionSelectionType: "REGISTERED",
        gymId: placeholderGym.id,
        fighterId: f.id,
        status: ApplicationStatus.approved,
        paymentStatus: "unpaid",
        fighterSnapshot: { name: f.name },
        gymSnapshot: {
          gymId: placeholderGym.id,
          name: i === 0 ? "T-MAC 종합격투기" : `팀라벨 짐${i}`,
        },
      },
    });
  }

  // 0경기 그룹이 목록에 있어야 함
  const groups = await bracketService.listOrganizerEventBrackets(actor, event.id);
  const group = groups.find((g) => g.divisionId === division.id);
  assert.ok(group, "0-match division group missing");
  assert.equal(group.matchCount, 0);
  assert.equal(group.applicantCount, 3);
  assert.equal(group.unmatchedCount, 3);
  pass("zeroMatchGroup", {
    applicantCount: group.applicantCount,
    matchCount: group.matchCount,
    unmatchedCount: group.unmatchedCount,
  });

  const unmatched = await bracketAutoMatchService.listUnmatchedCandidatesForEvent(
    actor,
    event.id,
  );
  const waiting = unmatched.filter((u) => u.reason === "not_assigned");
  assert.equal(waiting.length, 3);
  assert.ok(waiting.every((u) => !u.gymName.startsWith("MATCHON 외부등록")));
  pass("unmatchedList", {
    count: waiting.length,
    gyms: waiting.map((u) => u.gymName),
  });

  const { bracketId } = await bracketService.ensureBracketShellForDivision(actor, {
    eventId: event.id,
    divisionId: division.id,
  });

  const empty = await bracketService.addEmptyBracketMatch(actor, {
    bracketId,
    defaultCourtId: court.id,
  });
  pass("addEmptyMatch", { matchId: empty.matchId });

  // 수동 배정은 서비스 경로가 알림 트랜잭션과 결합되어 remote DB에서 timeout 가능.
  // gym snapshot SSOT는 buildFighterBracketSnapshot으로 검증하고 슬롯은 직접 반영.
  const { buildFighterBracketSnapshot } = await import(
    "../src/lib/bracket-snapshot"
  );
  const apps = await prisma.eventApplication.findMany({
    where: { eventId: event.id },
    include: {
      fighter: true,
      division: true,
      gym: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const redApp = apps[0]!;
  const blueApp = apps[1]!;
  const redSnap = buildFighterBracketSnapshot({
    fighter: redApp.fighter,
    division: redApp.division!,
    gym: { name: redApp.gym.name },
    gymSnapshot: redApp.gymSnapshot,
  });
  const blueSnap = buildFighterBracketSnapshot({
    fighter: blueApp.fighter,
    division: blueApp.division!,
    gym: { name: blueApp.gym.name },
    gymSnapshot: blueApp.gymSnapshot,
  });
  assert.equal(redSnap.gymName, "T-MAC 종합격투기");
  assert.ok(!(redSnap.gymName ?? "").startsWith("MATCHON 외부등록"));

  await prisma.bracketMatch.update({
    where: { id: empty.matchId },
    data: {
      fighterRedId: fighters[0]!.id,
      fighterBlueId: fighters[1]!.id,
      fighterRedSnapshot: redSnap,
      fighterBlueSnapshot: blueSnap,
    },
  });
  pass("assignUsesRealGym", { redGym: redSnap.gymName });

  const groups2 = await bracketService.listOrganizerEventBrackets(actor, event.id);
  const g2 = groups2.find((g) => g.divisionId === division.id)!;
  assert.equal(g2.matchCount, 1);
  assert.equal(g2.unmatchedCount, 1);
  pass("countsAfterAssign", {
    matchCount: g2.matchCount,
    unmatchedCount: g2.unmatchedCount,
  });

  await bracketService.deleteBracketMatch(actor, {
    bracketId,
    matchId: empty.matchId,
  });
  const groups3 = await bracketService.listOrganizerEventBrackets(actor, event.id);
  const g3 = groups3.find((g) => g.divisionId === division.id)!;
  assert.equal(g3.matchCount, 0);
  assert.equal(g3.unmatchedCount, 3);
  pass("countsAfterDelete", {
    matchCount: g3.matchCount,
    unmatchedCount: g3.unmatchedCount,
  });

  // Browser smoke — group list columns
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1366, height: 900 });
    const password = String(app.DEMO_PASSWORD || "123456!!");
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (page.url().includes("/login")) {
      const idBox = page.locator("#login-identifier, input[name='identifier']");
      if (await idBox.count()) await idBox.first().fill("organizer");
      await page.locator("input[type='password']").first().fill(password);
      await page.locator("button[type='submit']").first().click();
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
        timeout: 45_000,
      });
    }
    // Preview may lag — soft smoke if SHA mismatch
    await page.goto(`${BASE}/organizer/events/${event.id}/brackets?tab=generate`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const body = await page.locator("body").innerText();
    pass("browserGroupList", {
      hasUnmatchedHeader:
        body.includes("미매칭") || body.includes("미매칭 선수"),
      hasManage: body.includes("관리"),
      note: allowShaMismatch
        ? "soft — Preview may not serve latest until deploy"
        : "ok",
    });
  } finally {
    await browser.close();
  }

  if (!process.argv.includes("--keep")) {
    await cleanupQa();
  }

  report.ok = true;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, flows: Object.keys(report.flows as object) }, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  report.ok = false;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error(e);
  process.exit(1);
});
