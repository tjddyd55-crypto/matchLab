/**
 * 주심 경기 lifecycle DB 검증 (임시 fixture 생성·원복).
 * Run: npm run verify:judge-lifecycle
 *
 * 기존 실경기를 바꾸지 않는다. 같은 코트의 기존 대진에 waiting 경기 2개를 붙였다 지운다.
 */
import "dotenv/config";
import {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  MatchRecordOutcome,
  MatchRecordStatus,
} from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";

const EVENT_ID =
  process.env.JUDGE_UI_E2E_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const COURT_ID =
  process.env.JUDGE_LIFECYCLE_COURT_ID ?? "cmqfsqfhp000j0po9hryb2s41";

function assert(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    throw new Error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
  console.log(`OK: ${name}`);
}

async function findOngoing(courtId: string) {
  return prisma.bracketMatch.findFirst({
    where: { courtId, status: BracketMatchStatus.ongoing },
    orderBy: [{ courtOrder: "asc" }, { matchOrder: "asc" }],
  });
}

async function prepareMatch(courtId: string, matchId: string) {
  const target = await prisma.bracketMatch.findFirst({
    where: { id: matchId, courtId, status: BracketMatchStatus.waiting },
  });
  if (!target) throw new Error("prepare target missing");
  await prisma.bracketMatch.update({
    where: { id: target.id },
    data: { status: BracketMatchStatus.called },
  });
}

async function startMatch(courtId: string, matchId: string) {
  const ongoing = await findOngoing(courtId);
  if (ongoing) {
    const label =
      ongoing.courtOrder != null ? `제${ongoing.courtOrder}경기` : "다른 경기";
    const err = new Error(
      `${label}이(가) 진행 중입니다. 해당 경기를 종료한 후 시작할 수 있습니다.`,
    ) as Error & { code: string };
    err.code = "CONFLICT";
    throw err;
  }
  const target = await prisma.bracketMatch.findFirst({
    where: { id: matchId, courtId, status: BracketMatchStatus.called },
  });
  if (!target) throw new Error("start target missing");
  await prisma.bracketMatch.update({
    where: { id: target.id },
    data: { status: BracketMatchStatus.ongoing, startedAt: new Date() },
  });
}

async function completeMatch(params: {
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
        resultMemo: "lifecycle-e2e",
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
          result: MatchRecordOutcome.win,
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
          result: MatchRecordOutcome.loss,
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

async function createFixturePair() {
  const donor = await prisma.bracketMatch.findFirst({
    where: {
      courtId: COURT_ID,
      bracket: { eventId: EVENT_ID },
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
    throw new Error("fixture donor match with fighters not found");
  }

  const maxOrder = await prisma.bracketMatch.aggregate({
    where: { courtId: COURT_ID },
    _max: { courtOrder: true, matchOrder: true, globalMatchOrder: true },
  });
  const baseCourt = (maxOrder._max.courtOrder ?? 900) + 1;
  const baseMatch = (maxOrder._max.matchOrder ?? 900) + 1;
  const baseGlobal = (maxOrder._max.globalMatchOrder ?? 900) + 1;

  const a = await prisma.bracketMatch.create({
    data: {
      bracketId: donor.bracketId,
      courtId: COURT_ID,
      courtOrder: baseCourt,
      matchOrder: baseMatch,
      globalMatchOrder: baseGlobal,
      matchNumber: baseGlobal,
      status: BracketMatchStatus.waiting,
      fighterRedId: donor.fighterRedId,
      fighterBlueId: donor.fighterBlueId,
      fighterRedSnapshot: donor.fighterRedSnapshot ?? undefined,
      fighterBlueSnapshot: donor.fighterBlueSnapshot ?? undefined,
    },
  });
  const b = await prisma.bracketMatch.create({
    data: {
      bracketId: donor.bracketId,
      courtId: COURT_ID,
      courtOrder: baseCourt + 1,
      matchOrder: baseMatch + 1,
      globalMatchOrder: baseGlobal + 1,
      matchNumber: baseGlobal + 1,
      status: BracketMatchStatus.waiting,
      fighterRedId: donor.fighterRedId,
      fighterBlueId: donor.fighterBlueId,
      fighterRedSnapshot: donor.fighterRedSnapshot ?? undefined,
      fighterBlueSnapshot: donor.fighterBlueSnapshot ?? undefined,
    },
  });

  return {
    a,
    b,
    eventTitle: donor.bracket.event.title,
    eventId: EVENT_ID,
    bracketId: donor.bracketId,
  };
}

async function destroyFixture(matchIds: string[]) {
  await prisma.matchResult.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.judgeScorecard.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.bracketMatch.deleteMany({ where: { id: { in: matchIds } } });
}

async function main() {
  // 기존 ongoing 은 건드리지 않되, 단일성 검증을 위해 일시적으로 격리 코트처럼
  // “가상 ongoing 차단”을 우리 fixture끼리만 검증한다.
  // 실 ongoing이 있으면 startMatch가 막히므로, 그 경우 격리 로직으로 검증:
  // findOngoing 범위에 fixture only를 못 하므로 → 메시지/종료 전이만 분리 검증.
  const preexistingOngoing = await prisma.bracketMatch.count({
    where: { courtId: COURT_ID, status: "ongoing" },
  });

  const fixture = await createFixturePair();
  const ids = [fixture.a.id, fixture.b.id];

  try {
    if (preexistingOngoing > 0) {
      // 실 ongoing이 있으면 start는 불가. prepare + complete 트랜잭션 형태만 검증
      await prepareMatch(COURT_ID, fixture.a.id);
      const called = await prisma.bracketMatch.findUniqueOrThrow({
        where: { id: fixture.a.id },
        select: { status: true },
      });
      assert("prepare → called (with preexisting ongoing)", called.status === "called");

      // ongoing으로 강제 세팅 후 complete 경로 검증 (단일성 정책 밖 인위 데이터는 fixture만)
      await prisma.bracketMatch.update({
        where: { id: fixture.a.id },
        data: { status: BracketMatchStatus.ongoing, startedAt: new Date() },
      });

      // 동시 진행 차단: 기존 ongoing이 이미 있으므로 start B는 무조건 CONFLICT
      let blocked = false;
      let blockMessage = "";
      try {
        await startMatch(COURT_ID, fixture.b.id);
      } catch (e) {
        blocked =
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code: string }).code === "CONFLICT";
        blockMessage = e instanceof Error ? e.message : String(e);
      }
      assert("second start blocked by court ongoing", blocked, blockMessage);
      assert(
        "block message includes match label",
        /제\d+경기/.test(blockMessage),
        blockMessage,
      );

      await completeMatch({
        matchId: fixture.a.id,
        winnerId: fixture.a.fighterRedId!,
        loserId: fixture.a.fighterBlueId!,
        eventId: fixture.eventId,
        bracketId: fixture.bracketId,
        eventTitle: fixture.eventTitle,
      });
      const done = await prisma.bracketMatch.findUniqueOrThrow({
        where: { id: fixture.a.id },
        select: { status: true, endedAt: true, winnerId: true },
      });
      assert("complete → finished", done.status === "finished");
      assert("endedAt set", done.endedAt != null);
      assert("winner saved", done.winnerId === fixture.a.fighterRedId);
      const results = await prisma.matchResult.count({
        where: { matchId: fixture.a.id, status: "confirmed" },
      });
      assert("MatchResult confirmed×2", results === 2);
      console.log(
        `NOTE: preexisting ongoing on court=${preexistingOngoing} (left untouched)`,
      );
    } else {
      await prepareMatch(COURT_ID, fixture.a.id);
      assert(
        "prepare → called",
        (await prisma.bracketMatch.findUniqueOrThrow({ where: { id: fixture.a.id } }))
          .status === "called",
      );

      await startMatch(COURT_ID, fixture.a.id);
      const afterStart = await prisma.bracketMatch.findUniqueOrThrow({
        where: { id: fixture.a.id },
        select: { status: true, startedAt: true },
      });
      assert("start → ongoing", afterStart.status === "ongoing");
      assert("startedAt set", afterStart.startedAt != null);

      await prepareMatch(COURT_ID, fixture.b.id);
      let blocked = false;
      let blockMessage = "";
      try {
        await startMatch(COURT_ID, fixture.b.id);
      } catch (e) {
        blocked =
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code: string }).code === "CONFLICT";
        blockMessage = e instanceof Error ? e.message : String(e);
      }
      assert("second start blocked", blocked, blockMessage);
      assert("block message names match", /제\d+경기/.test(blockMessage), blockMessage);

      await completeMatch({
        matchId: fixture.a.id,
        winnerId: fixture.a.fighterRedId!,
        loserId: fixture.a.fighterBlueId!,
        eventId: fixture.eventId,
        bracketId: fixture.bracketId,
        eventTitle: fixture.eventTitle,
      });
      const afterComplete = await prisma.bracketMatch.findUniqueOrThrow({
        where: { id: fixture.a.id },
        select: { status: true, endedAt: true, winnerId: true },
      });
      assert("complete → finished", afterComplete.status === "finished");
      assert("endedAt set", afterComplete.endedAt != null);
      assert("winner saved", afterComplete.winnerId === fixture.a.fighterRedId);

      await startMatch(COURT_ID, fixture.b.id);
      assert(
        "after A finished, B can start",
        (await prisma.bracketMatch.findUniqueOrThrow({ where: { id: fixture.b.id } }))
          .status === "ongoing",
      );
    }
  } finally {
    await destroyFixture(ids);
    console.log("Destroyed lifecycle fixture matches.");
  }

  console.log("judge-head-match-lifecycle: ALL PASS");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
