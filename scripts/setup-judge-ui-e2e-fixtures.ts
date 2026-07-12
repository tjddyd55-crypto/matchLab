/**
 * Railway DB에 심판 UI E2E용 fixture 생성 (db:seed 금지, additive only).
 * 출력: /tmp/judge-ui-e2e-manifest.json
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { JudgeCredentialRole } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";
import { judgeAssignmentRepository } from "../src/lib/repositories/judge-assignment.repository";
import { judgeCredentialRepository } from "../src/lib/repositories/judge-credential.repository";

const EVENT_ID = process.env.JUDGE_UI_E2E_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const ASSIGNED_MATCH_ID =
  process.env.JUDGE_UI_E2E_MATCH_ID ?? "cmq963zle002f0pjzgdpjlsox";
const UNASSIGNED_MATCH_ID =
  process.env.JUDGE_UI_E2E_UNASSIGNED_MATCH_ID ?? "cmq963ze6000p0pjzpru7bioq";
const PASSWORD = process.env.JUDGE_UI_E2E_PASSWORD ?? "JudgeUiE2e6512!";
const BASE_URL = process.env.JUDGE_UI_E2E_BASE_URL ?? "http://localhost:3000";

function hashJudgePassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function upsertCredential(
  eventId: string,
  loginId: string,
  role: JudgeCredentialRole,
) {
  const existing = await prisma.judgeAccessCredential.findFirst({
    where: { eventId, loginId },
  });
  const passwordHash = hashJudgePassword(PASSWORD);
  if (existing) {
    await prisma.judgeAccessCredential.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role,
        isActive: true,
        verifiedName: null,
        birthDate: null,
        identityConfirmedAt: null,
        identityConfirmedIp: null,
        identityConfirmedUserAgent: null,
      },
    });
    await prisma.judgeScorecard.deleteMany({
      where: { credentialId: existing.id },
    });
    return existing.id;
  }
  const created = await judgeCredentialRepository.create({
    eventId,
    loginId,
    passwordHash,
    displayName: loginId,
    role,
  });
  return created.id;
}

/** E2E lock 테스트 등으로 확정·잠긴 경기를 채점 가능 상태로 되돌림 (지정 matchId만). */
async function unlockE2eMatchForScoring(matchId: string) {
  await prisma.matchResult.deleteMany({
    where: { matchId, status: "confirmed" },
  });
  await prisma.judgeScorecard.updateMany({
    where: { matchId, status: "locked" },
    data: { status: "draft" },
  });
}

async function main() {
  const tag = `ui-e2e-6512`;
  const creds = {
    a: await upsertCredential(EVENT_ID, `${tag}-a`, JudgeCredentialRole.SCORING_JUDGE),
    b: await upsertCredential(EVENT_ID, `${tag}-b`, JudgeCredentialRole.SCORING_JUDGE),
    c: await upsertCredential(EVENT_ID, `${tag}-c`, JudgeCredentialRole.SCORING_JUDGE),
    head: await upsertCredential(EVENT_ID, `${tag}-head`, JudgeCredentialRole.HEAD_JUDGE),
    ann: await upsertCredential(EVENT_ID, `${tag}-ann`, JudgeCredentialRole.ANNOUNCER),
  };

  await unlockE2eMatchForScoring(ASSIGNED_MATCH_ID);

  for (const id of [creds.a, creds.b, creds.c]) {
    const existingAssign = await prisma.judgeMatchAssignment.findFirst({
      where: { credentialId: id, matchId: ASSIGNED_MATCH_ID, isActive: true },
    });
    if (!existingAssign) {
      const order =
        id === creds.a ? 1 : id === creds.b ? 2 : 3;
      await judgeAssignmentRepository.create({
        eventId: EVENT_ID,
        matchId: ASSIGNED_MATCH_ID,
        credentialId: id,
        judgeOrder: order,
        isHeadJudge: order === 1,
      });
    }
  }

  const manifest = {
    baseUrl: BASE_URL,
    eventId: EVENT_ID,
    assignedMatchId: ASSIGNED_MATCH_ID,
    unassignedMatchId: UNASSIGNED_MATCH_ID,
    password: PASSWORD,
    judges: {
      a: { loginId: `${tag}-a`, role: "SCORING_JUDGE", name: "심판 A", birthDate: "1990-01-01" },
      b: { loginId: `${tag}-b`, role: "SCORING_JUDGE", name: "심판 B", birthDate: "1991-01-01" },
      c: { loginId: `${tag}-c`, role: "SCORING_JUDGE", name: "심판 C", birthDate: "1992-01-01" },
      head: { loginId: `${tag}-head`, role: "HEAD_JUDGE", name: "주심 김", birthDate: "1985-03-15" },
      ann: { loginId: `${tag}-ann`, role: "ANNOUNCER", name: "발표자 이", birthDate: "1988-07-20" },
    },
  };

  const manifestPath =
    process.env.JUDGE_UI_E2E_MANIFEST_PATH ??
    join(tmpdir(), "judge-ui-e2e-manifest.json");

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Fixture ready:", manifest);
  console.log("Manifest path:", manifestPath);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
