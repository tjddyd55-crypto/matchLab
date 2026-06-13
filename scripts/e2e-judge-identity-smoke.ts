/**
 * PR #53 심판 본인 확인·격리·revised·역할 E2E (repository 계층, db:seed 금지).
 *
 * Railway / 로컬:
 *   npm run e2e:judge-identity
 */
import "dotenv/config";

import { randomBytes, scryptSync } from "node:crypto";
import {
  BracketMatchStatus,
  BracketType,
  EventStatus,
  JudgeCredentialRole,
  JudgeScorecardStatus,
  MatchRecordStatus,
  OrganizerType,
  OrganizerStatus,
  UserRole,
} from "../src/generated/prisma";
import {
  aggregateJudgeScorecards,
  computeScorecardTotals,
} from "../src/lib/judge-score-aggregation";
import {
  formatBirthDateInput,
  judgeDefaultRoute,
  judgeRoleCanScore,
  JUDGE_ROLE_LABELS,
} from "../src/lib/judge-identity";
import { prisma } from "../src/lib/prisma";
import { judgeAssignmentRepository } from "../src/lib/repositories/judge-assignment.repository";
import { judgeCredentialRepository } from "../src/lib/repositories/judge-credential.repository";
import { judgeScorecardChangeLogRepository } from "../src/lib/repositories/judge-scorecard-change-log.repository";
import { judgeScorecardRepository } from "../src/lib/repositories/judge-scorecard.repository";

type JudgeSession = {
  credentialId: string;
  eventId: string;
  loginId: string;
  displayName: string | null;
  role: JudgeCredentialRole;
  roleLabel: string;
  verifiedName: string | null;
  identityConfirmedAt: string | null;
};

function hashJudgePassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

function sessionFor(
  row: Awaited<ReturnType<typeof judgeCredentialRepository.findById>>,
): JudgeSession {
  if (!row) throw new Error("credential missing");
  return {
    credentialId: row.id,
    eventId: row.eventId,
    loginId: row.loginId,
    displayName: row.displayName,
    role: row.role,
    roleLabel: JUDGE_ROLE_LABELS[row.role],
    verifiedName: row.verifiedName,
    identityConfirmedAt: row.identityConfirmedAt?.toISOString() ?? null,
  };
}

async function confirmIdentity(credentialId: string, name: string) {
  await judgeCredentialRepository.confirmIdentity(credentialId, {
    verifiedName: name,
    birthDate: new Date("1990-05-15T00:00:00.000Z"),
    phone: null,
    organization: null,
    identityConfirmedIp: "127.0.0.1",
    identityConfirmedUserAgent: "e2e-smoke",
  });
}

type RoundInput = {
  roundNumber: number;
  redScore: number;
  blueScore: number;
  redKnockdowns: number;
  blueKnockdowns: number;
  redDeductions: number;
  blueDeductions: number;
  warningMemo: string | null;
  roundMemo: string | null;
};

function roundScores(count: number, red: number, blue: number): RoundInput[] {
  return Array.from({ length: count }, (_, i) => ({
    roundNumber: i + 1,
    redScore: red,
    blueScore: blue,
    redKnockdowns: 0,
    blueKnockdowns: 0,
    redDeductions: 0,
    blueDeductions: 0,
    warningMemo: null,
    roundMemo: null,
  }));
}

async function saveSubmittedScorecard(
  session: JudgeSession,
  matchId: string,
  rounds: RoundInput[],
  opts?: { memo?: string | null },
) {
  if (!judgeRoleCanScore(session.role)) {
    throw new Error("FORBIDDEN: cannot score");
  }
  if (!session.verifiedName?.trim()) {
    throw new Error("FORBIDDEN: identity required");
  }

  const assignments = await judgeAssignmentRepository.listByCredential(
    session.credentialId,
  );
  const assigned = assignments.some(
    (a) => a.matchId === matchId && a.isActive && a.eventId === session.eventId,
  );
  if (!assigned) throw new Error("FORBIDDEN: not assigned");

  const match = await prisma.bracketMatch.findUnique({
    where: { id: matchId },
    include: {
      matchResults: { select: { status: true } },
      bracket: { select: { eventId: true } },
    },
  });
  if (!match) throw new Error("match not found");

  const locked = match.matchResults.filter(
    (r) =>
      r.status === MatchRecordStatus.confirmed ||
      r.status === MatchRecordStatus.corrected,
  );
  if (locked.length >= 2) throw new Error("FORBIDDEN: result locked");

  const existing = await judgeScorecardRepository.findByMatchAndCredential(
    matchId,
    session.credentialId,
  );
  const credential = await judgeCredentialRepository.findById(session.credentialId);
  if (!credential) throw new Error("credential not found");

  const totals = computeScorecardTotals(rounds);
  const status =
    existing?.status === JudgeScorecardStatus.submitted ||
    existing?.status === JudgeScorecardStatus.revised
      ? JudgeScorecardStatus.revised
      : JudgeScorecardStatus.submitted;

  const action =
    existing?.status === JudgeScorecardStatus.submitted ||
    existing?.status === JudgeScorecardStatus.revised
      ? "revise"
      : "submit";

  const upserted = await judgeScorecardRepository.upsertDraft({
    eventId: match.bracket.eventId,
    matchId,
    credentialId: session.credentialId,
    judgeName: session.verifiedName.trim(),
    judgeBirthDateSnapshot: credential.birthDate
      ? formatBirthDateInput(credential.birthDate)
      : null,
    judgeRoleSnapshot: session.role,
    cornerRedFighterId: match.fighterRedId,
    cornerBlueFighterId: match.fighterBlueId,
    roundCount: rounds.length,
    status,
    redTotal: totals.redTotal,
    blueTotal: totals.blueTotal,
    winnerCorner: totals.winnerCorner,
    decisionMethod: "decision",
    memo: opts?.memo?.trim() || null,
    submittedAt: new Date(),
    submittedIp: "127.0.0.1",
    submittedUserAgent: "e2e-smoke",
    rounds,
  });

  await judgeScorecardChangeLogRepository.create({
    scorecardId: upserted.id,
    eventId: upserted.eventId,
    matchId: upserted.matchId,
    credentialId: upserted.credentialId,
    judgeNameSnapshot: session.verifiedName.trim(),
    judgeBirthDateSnapshot: credential.birthDate
      ? formatBirthDateInput(credential.birthDate)
      : null,
    judgeRoleSnapshot: session.role,
    action,
    previousStatus: existing?.status ?? null,
    newStatus: status,
    previousRedTotal: existing?.redTotal ?? null,
    previousBlueTotal: existing?.blueTotal ?? null,
    newRedTotal: upserted.redTotal,
    newBlueTotal: upserted.blueTotal,
    previousWinnerCorner: existing?.winnerCorner ?? null,
    newWinnerCorner: upserted.winnerCorner,
    roundsSnapshotJson: rounds,
    changedByCredentialId: session.credentialId,
    changedIp: "127.0.0.1",
    changedUserAgent: "e2e-smoke",
  });
}

function hasSubmittedStatus(status: JudgeScorecardStatus): boolean {
  return (
    status === JudgeScorecardStatus.submitted ||
    status === JudgeScorecardStatus.revised ||
    status === JudgeScorecardStatus.locked
  );
}

async function expectForbidden(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    throw new Error(`${label}: expected FORBIDDEN`);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("FORBIDDEN")) return;
    if (e instanceof Error && e.message.includes("expected FORBIDDEN")) throw e;
    throw new Error(`${label}: unexpected error ${e}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL가 필요합니다.");
  }

  const tag = `e2e-${Date.now()}`;
  console.log(`=== Judge identity E2E (${tag}) ===\n`);

  const user = await prisma.user.create({
    data: {
      email: `${tag}@internal.test`,
      loginId: `${tag}-org`,
      role: UserRole.organizer,
      name: "E2E Organizer",
    },
  });

  const organizer = await prisma.organizer.create({
    data: {
      userId: user.id,
      name: "E2E Org",
      type: OrganizerType.individual,
      status: OrganizerStatus.approved,
    },
  });

  const now = new Date();
  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      title: `Judge E2E ${tag}`,
      eventDate: now,
      registrationStartDate: now,
      registrationEndDate: new Date(now.getTime() + 86400000),
      status: EventStatus.open,
      publicSlug: `${tag}-slug`,
    },
  });

  const red = await prisma.fighter.create({
    data: {
      name: "홍선수",
      fighterCode: `${tag}-R`,
      gender: "male",
      birthDate: new Date("2010-01-01T00:00:00.000Z"),
      phone: "01011112222",
    },
  });
  const blue = await prisma.fighter.create({
    data: {
      name: "청선수",
      fighterCode: `${tag}-B`,
      gender: "male",
      birthDate: new Date("2010-02-01T00:00:00.000Z"),
      phone: "01033334444",
    },
  });

  const bracket = await prisma.bracket.create({
    data: {
      eventId: event.id,
      title: "E2E",
      type: BracketType.match_list,
    },
  });

  const match = await prisma.bracketMatch.create({
    data: {
      bracketId: bracket.id,
      matchOrder: 1,
      matchNumber: 1,
      fighterRedId: red.id,
      fighterBlueId: blue.id,
      status: BracketMatchStatus.waiting,
    },
  });

  const pw = hashJudgePassword("judge-e2e-pw");
  const mkCred = async (loginId: string, role: JudgeCredentialRole) =>
    judgeCredentialRepository.create({
      eventId: event.id,
      loginId,
      passwordHash: pw,
      displayName: loginId,
      role,
    });

  const credA = await mkCred(`${tag}-a`, JudgeCredentialRole.SCORING_JUDGE);
  const credB = await mkCred(`${tag}-b`, JudgeCredentialRole.SCORING_JUDGE);
  const credC = await mkCred(`${tag}-c`, JudgeCredentialRole.SCORING_JUDGE);
  const credHead = await mkCred(`${tag}-head`, JudgeCredentialRole.HEAD_JUDGE);
  await mkCred(`${tag}-ann`, JudgeCredentialRole.ANNOUNCER);

  for (const [cred, order] of [
    [credA, 1],
    [credB, 2],
    [credC, 3],
  ] as const) {
    await judgeAssignmentRepository.create({
      eventId: event.id,
      matchId: match.id,
      credentialId: cred.id,
      judgeOrder: order,
      isHeadJudge: order === 1,
    });
  }

  const sessionAUnverified = sessionFor(await judgeCredentialRepository.findById(credA.id));
  await expectForbidden(
    () => saveSubmittedScorecard(sessionAUnverified, match.id, roundScores(3, 10, 9)),
    "unverified identity cannot score",
  );
  console.log("OK identity gate before scoring");

  await confirmIdentity(credA.id, "심판 A");
  await confirmIdentity(credB.id, "심판 B");
  await confirmIdentity(credC.id, "심판 C");
  await confirmIdentity(credHead.id, "주심 김");

  const sessionA = sessionFor(await judgeCredentialRepository.findById(credA.id));
  const sessionB = sessionFor(await judgeCredentialRepository.findById(credB.id));

  await saveSubmittedScorecard(sessionA, match.id, roundScores(3, 10, 9));

  const cardA = await judgeScorecardRepository.findByMatchAndCredential(
    match.id,
    credA.id,
  );
  if (!cardA?.judgeName.includes("심판 A") || cardA.credentialId !== credA.id) {
    throw new Error("A scorecard missing snapshot or credentialId");
  }
  console.log("OK A submit: judgeName + credentialId");

  const bView = await judgeScorecardRepository.findByMatchAndCredential(
    match.id,
    credB.id,
  );
  if (bView) throw new Error("B should not have A scorecard");
  console.log("OK B isolated from A scorecard");

  await saveSubmittedScorecard(sessionB, match.id, roundScores(3, 9, 10));

  await saveSubmittedScorecard(sessionA, match.id, roundScores(3, 10, 8), {
    memo: "수정",
  });

  const cardARevised = await judgeScorecardRepository.findByMatchAndCredential(
    match.id,
    credA.id,
  );
  if (cardARevised?.status !== JudgeScorecardStatus.revised) {
    throw new Error(`Expected revised, got ${cardARevised?.status}`);
  }
  console.log("OK A revise → revised");

  const scorecards = await judgeScorecardRepository.listByEvent(event.id);
  const submittedKeys = new Set(
    scorecards
      .filter((s) => hasSubmittedStatus(s.status))
      .map((s) => `${s.matchId}:${s.credentialId}`),
  );
  if (!submittedKeys.has(`${match.id}:${credA.id}`)) {
    throw new Error("Organizer UI: revised not counted as submitted");
  }
  console.log("OK revised counts as submitted in assignment logic");

  const sessionHead = sessionFor(await judgeCredentialRepository.findById(credHead.id));
  if (judgeDefaultRoute(sessionHead.role) !== "/judge/review") {
    throw new Error("HEAD_JUDGE default route");
  }

  const assignments = await judgeAssignmentRepository.listByMatch(match.id);
  const matchScorecards = await judgeScorecardRepository.listByMatch(match.id);
  const agg = aggregateJudgeScorecards(
    assignments.map((a) => a.credential?.verifiedName ?? a.credential?.loginId ?? ""),
    assignments.map((a) => {
      const card = matchScorecards.find((s) => s.credentialId === a.credentialId);
      const role = card?.judgeRoleSnapshot ?? a.credential?.role ?? "SCORING_JUDGE";
      return {
        judgeName: card?.judgeName ?? a.credential?.verifiedName ?? "—",
        roleLabel: JUDGE_ROLE_LABELS[role],
        redTotal: card?.redTotal ?? null,
        blueTotal: card?.blueTotal ?? null,
        winnerCorner: card?.winnerCorner ?? "undecided",
        submitted: hasSubmittedStatus(card?.status ?? JudgeScorecardStatus.draft),
        submittedAt: card?.submittedAt?.toISOString() ?? null,
      };
    }),
  );
  if (agg.submittedCount < 2) {
    throw new Error(`HEAD_JUDGE aggregation submittedCount=${agg.submittedCount}`);
  }
  console.log("OK HEAD_JUDGE aggregation");

  if (judgeDefaultRoute(JudgeCredentialRole.ANNOUNCER) !== "/judge/results") {
    throw new Error("ANNOUNCER default route");
  }
  if (judgeRoleCanScore(JudgeCredentialRole.ANNOUNCER)) {
    throw new Error("ANNOUNCER must not score");
  }
  console.log("OK role routes");

  const otherMatch = await prisma.bracketMatch.create({
    data: {
      bracketId: bracket.id,
      matchOrder: 2,
      matchNumber: 2,
      status: BracketMatchStatus.waiting,
    },
  });
  await expectForbidden(
    () => saveSubmittedScorecard(sessionA, otherMatch.id, roundScores(3, 10, 9)),
    "unassigned match",
  );
  console.log("OK unassigned match blocked");

  await prisma.matchResult.createMany({
    data: [
      {
        eventId: event.id,
        bracketId: bracket.id,
        matchId: match.id,
        fighterId: red.id,
        opponentFighterId: blue.id,
        result: "win",
        eventTitleSnapshot: event.title,
        fighterSnapshot: { name: red.name },
        opponentSnapshot: { name: blue.name },
        matchDate: now,
        status: "confirmed",
        confirmedAt: now,
      },
      {
        eventId: event.id,
        bracketId: bracket.id,
        matchId: match.id,
        fighterId: blue.id,
        opponentFighterId: red.id,
        result: "loss",
        eventTitleSnapshot: event.title,
        fighterSnapshot: { name: blue.name },
        opponentSnapshot: { name: red.name },
        matchDate: now,
        status: "confirmed",
        confirmedAt: now,
      },
    ],
  });

  await expectForbidden(
    () => saveSubmittedScorecard(sessionA, match.id, roundScores(3, 10, 9)),
    "locked after MatchResult confirmed",
  );
  console.log("OK MatchResult confirmed blocks edits");

  console.log("\nAll E2E checks passed.");
}

main()
  .catch((e) => {
    console.error("E2E FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
