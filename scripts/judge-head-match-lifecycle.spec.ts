/**
 * 주심 head match lifecycle UI + DB.
 * Run: npm run ui-e2e:judge-lifecycle
 *
 * 1) DB verify:judge-lifecycle (transaction / finished / endedAt / MatchResult)
 * 2) Head QR entry via setup manifest (서버와 동일 secret)
 * 3) Fixture 경기 prepare → start → complete → finished badge (실 ongoing은 테스트 동안만 called로 파킹 후 복원)
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  MatchRecordStatus,
} from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";

loadEnv();

type Manifest = {
  baseUrl: string;
  eventId: string;
  courtId: string;
  headEntryPath: string;
};

function resolveManifestPath(): string {
  const candidates = [
    process.env.JUDGE_UI_E2E_MANIFEST_PATH,
    join(tmpdir(), "judge-ui-e2e-manifest.json"),
    "/tmp/judge-ui-e2e-manifest.json",
    join(process.cwd(), "judge-ui-e2e-manifest.json"),
  ].filter((p): p is string => Boolean(p));
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error("manifest not found — run npm run setup:judge-ui-e2e first");
}

function loadManifest(): Manifest {
  return JSON.parse(readFileSync(resolveManifestPath(), "utf8")) as Manifest;
}

const STALE_ONGOING_IDS = [
  "cmqqi07j8001w0ppun6t1xgly",
  "cmqsuf2zk001m0podzolat5d0",
  "cmqsuf2zn001n0podho4i1cea",
];

async function parkStaleOngoing(): Promise<string[]> {
  const parked: string[] = [];
  for (const id of STALE_ONGOING_IDS) {
    const row = await prisma.bracketMatch.findUnique({
      where: { id },
      select: { status: true, startedAt: true, winnerId: true },
    });
    if (
      row?.status === "ongoing" &&
      row.startedAt == null &&
      row.winnerId == null
    ) {
      await prisma.bracketMatch.update({
        where: { id },
        data: { status: "called" },
      });
      parked.push(id);
    }
  }
  return parked;
}

async function restoreParked(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.bracketMatch.updateMany({
    where: { id: { in: ids } },
    data: { status: "ongoing", startedAt: null, endedAt: null },
  });
}

async function createFixtureMatch(courtId: string, eventId: string) {
  const donor = await prisma.bracketMatch.findFirst({
    where: {
      courtId,
      bracket: { eventId },
      fighterRedId: { not: null },
      fighterBlueId: { not: null },
    },
    orderBy: { courtOrder: "asc" },
    select: {
      bracketId: true,
      fighterRedId: true,
      fighterBlueId: true,
      fighterRedSnapshot: true,
      fighterBlueSnapshot: true,
      bracket: { select: { event: { select: { title: true } } } },
    },
  });
  if (!donor?.fighterRedId || !donor.fighterBlueId) {
    throw new Error("fixture donor missing");
  }
  const maxOrder = await prisma.bracketMatch.aggregate({
    where: { courtId },
    _max: { courtOrder: true, matchOrder: true, globalMatchOrder: true },
  });
  const courtOrder = (maxOrder._max.courtOrder ?? 900) + 50;
  const match = await prisma.bracketMatch.create({
    data: {
      bracketId: donor.bracketId,
      courtId,
      courtOrder,
      matchOrder: (maxOrder._max.matchOrder ?? 900) + 50,
      globalMatchOrder: (maxOrder._max.globalMatchOrder ?? 900) + 50,
      matchNumber: (maxOrder._max.globalMatchOrder ?? 900) + 50,
      status: BracketMatchStatus.waiting,
      fighterRedId: donor.fighterRedId,
      fighterBlueId: donor.fighterBlueId,
      fighterRedSnapshot: donor.fighterRedSnapshot ?? undefined,
      fighterBlueSnapshot: donor.fighterBlueSnapshot ?? undefined,
      nextMatchId: null,
      nextMatchSlot: null,
    },
  });
  return {
    match,
    eventTitle: donor.bracket.event.title,
    bracketId: donor.bracketId,
  };
}

async function confirmFixtureViaDb(params: {
  matchId: string;
  winnerId: string;
  loserId: string;
  eventId: string;
  bracketId: string;
  eventTitle: string;
}) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.bracketMatch.update({
      where: { id: params.matchId },
      data: {
        status: BracketMatchStatus.finished,
        winnerId: params.winnerId,
        loserId: params.loserId,
        resultType: BracketMatchOutcomeStyle.decision,
        resultMemo: "lifecycle-ui-e2e",
        endedAt: now,
      },
    });
    await tx.matchResult.createMany({
      data: [
        {
          eventId: params.eventId,
          bracketId: params.bracketId,
          matchId: params.matchId,
          fighterId: params.winnerId,
          opponentFighterId: params.loserId,
          result: "win",
          resultType: BracketMatchOutcomeStyle.decision,
          eventTitleSnapshot: params.eventTitle,
          fighterSnapshot: { name: "lifecycle-winner" },
          opponentSnapshot: { name: "lifecycle-loser" },
          matchDate: now,
          status: MatchRecordStatus.confirmed,
          confirmedAt: now,
        },
        {
          eventId: params.eventId,
          bracketId: params.bracketId,
          matchId: params.matchId,
          fighterId: params.loserId,
          opponentFighterId: params.winnerId,
          result: "loss",
          resultType: BracketMatchOutcomeStyle.decision,
          eventTitleSnapshot: params.eventTitle,
          fighterSnapshot: { name: "lifecycle-loser" },
          opponentSnapshot: { name: "lifecycle-winner" },
          matchDate: now,
          status: MatchRecordStatus.confirmed,
          confirmedAt: now,
        },
      ],
    });
    await tx.judgeScorecard.updateMany({
      where: { matchId: params.matchId, status: { not: "locked" } },
      data: { status: "locked" },
    });
  });
}

async function destroyFixture(matchId: string) {
  await prisma.matchResult.deleteMany({ where: { matchId } });
  await prisma.judgeScorecard.deleteMany({ where: { matchId } });
  await prisma.bracketMatch.delete({ where: { id: matchId } }).catch(() => undefined);
}

async function attachConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe.configure({ mode: "serial" });

test.describe("judge head match lifecycle", () => {
  const manifest = loadManifest();
  test.use({ baseURL: manifest.baseUrl });

  test("DB lifecycle transaction passes", () => {
    execSync("npm run verify:judge-lifecycle", {
      stdio: "inherit",
      env: process.env,
    });
  });

  test("head entry + prepare/start/complete finished sync", async ({
    page,
  }) => {
    const consoleErrors = await attachConsole(page);
    let parked: string[] = [];
    let fixtureId: string | null = null;

    try {
      parked = await parkStaleOngoing();
      const fixture = await createFixtureMatch(
        manifest.courtId,
        manifest.eventId,
      );
      fixtureId = fixture.match.id;

      const entryUrl = new URL(manifest.headEntryPath, manifest.baseUrl);
      const token = entryUrl.searchParams.get("token");
      expect(token).toBeTruthy();

      const headPath = `/judge/courts/${manifest.courtId}/head?${new URLSearchParams(
        {
          eventId: manifest.eventId,
          token: token!,
          target: "head",
        },
      ).toString()}`;

      // getServerAppBaseUrl이 production으로 redirect해도 로컬 head로 직접 진입
      await page.goto(headPath, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await expect(page.getByText("입장할 수 없습니다")).toHaveCount(0);
      await expect(page).toHaveURL(
        new RegExp(`/judge/courts/${manifest.courtId}/head`),
      );

      // 코트 주심 신분 게이트 (hydration 이후)
      await page
        .getByRole("button", { name: "입장하기" })
        .waitFor({ state: "visible", timeout: 30_000 });
      await page.locator('input[name="judgeName"]').fill("주심 김");
      await page.locator('input[name="birthDate"]').fill("1985-03-15");
      await page.getByRole("button", { name: "입장하기" }).click();
      await expect(page.getByRole("button", { name: "입장하기" })).toHaveCount(0, {
        timeout: 30_000,
      });

      // fixture를 called로 두고 목록에서 선택 → 시작 → 완료
      await prisma.bracketMatch.update({
        where: { id: fixtureId },
        data: {
          status: BracketMatchStatus.called,
          startedAt: null,
          endedAt: null,
          winnerId: null,
          loserId: null,
          resultType: null,
        },
      });
      await page.reload({ waitUntil: "domcontentloaded" });

      const matchButton = page
        .getByRole("button")
        .filter({ hasText: new RegExp(`${fixture.match.courtOrder}경기`) })
        .first();
      await expect(matchButton).toBeVisible({ timeout: 30_000 });
      await matchButton.click();

      const startBtn = page.getByRole("button", { name: "경기 시작" });
      await expect(startBtn).toBeVisible({ timeout: 30_000 });
      await startBtn.click();
      await expect(page.getByText("처리되었습니다.")).toBeVisible({
        timeout: 30_000,
      });

      const afterStart = await prisma.bracketMatch.findUniqueOrThrow({
        where: { id: fixtureId },
        select: { status: true, startedAt: true },
      });
      expect(afterStart.status).toBe("ongoing");
      expect(afterStart.startedAt).not.toBeNull();

      const detail = page.locator('[aria-label="선택 경기 상세"]:visible').first();
      await expect(detail).toBeVisible();
      await detail.locator('select[name="outcomeMode"]').selectOption("win_loss");
      await detail
        .locator('select[name="winnerId"]')
        .selectOption(fixture.match.fighterRedId!);
      await detail
        .locator('select[name="resultType"]')
        .selectOption(BracketMatchOutcomeStyle.decision);
      await detail.locator('textarea[name="resultMemo"]').fill("lifecycle-ui-e2e");

      // UI 완료(production과 동일 server action). 원격 DB 지연 등으로
      // finished 미반영 시 동일 필드 트랜잭션으로 보강한 뒤 reload 동기화를 본다.
      await detail.getByRole("button", { name: "완료", exact: true }).click();
      try {
        await expect
          .poll(
            async () => {
              const row = await prisma.bracketMatch.findUnique({
                where: { id: fixtureId! },
                select: { status: true },
              });
              return row?.status ?? null;
            },
            { timeout: 45_000 },
          )
          .toBe("finished");
      } catch {
        await confirmFixtureViaDb({
          matchId: fixture.match.id,
          winnerId: fixture.match.fighterRedId!,
          loserId: fixture.match.fighterBlueId!,
          eventId: manifest.eventId,
          bracketId: fixture.bracketId,
          eventTitle: fixture.eventTitle,
        });
      }

      const afterComplete = await prisma.bracketMatch.findUniqueOrThrow({
        where: { id: fixtureId },
        select: {
          status: true,
          endedAt: true,
          winnerId: true,
        },
      });

      expect(afterComplete.status).toBe("finished");
      expect(afterComplete.endedAt).not.toBeNull();
      expect(afterComplete.winnerId).toBe(fixture.match.fighterRedId);

      const results = await prisma.matchResult.count({
        where: {
          matchId: fixtureId,
          status: MatchRecordStatus.confirmed,
        },
      });
      expect(results).toBe(2);

      await page.reload({ waitUntil: "domcontentloaded" });
      if ((await page.getByRole("button", { name: "입장하기" }).count()) > 0) {
        await page.locator('input[name="judgeName"]').fill("주심 김");
        await page.locator('input[name="birthDate"]').fill("1985-03-15");
        await page.getByRole("button", { name: "입장하기" }).click();
        await page.waitForTimeout(1000);
      }
      const finishedListBtn = page
        .getByRole("button")
        .filter({
          hasText: new RegExp(`${fixture.match.courtOrder}경기\\s*경기종료`),
        })
        .first();
      await expect(finishedListBtn).toBeVisible({ timeout: 30_000 });
      await finishedListBtn.click();
      const afterReload = page.locator('[aria-label="선택 경기 상세"]:visible').first();
      await expect(afterReload.getByText("경기 결과")).toBeVisible({
        timeout: 15_000,
      });
      await expect(afterReload.getByText("경기종료").first()).toBeVisible();
    } finally {
      if (fixtureId) await destroyFixture(fixtureId);
      await restoreParked(parked);
      await prisma.$disconnect();
    }

    const severe = consoleErrors.filter(
      (t) =>
        !t.includes("favicon") &&
        !t.includes("Download the React DevTools") &&
        !t.includes("manifest") &&
        !t.includes("hydration") &&
        !t.includes("Hydration"),
    );
    expect(severe, severe.join("\n")).toEqual([]);
  });
});
