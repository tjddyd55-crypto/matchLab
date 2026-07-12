/**
 * UI E2E용 배정 경기 MatchResult 확정 (additive only, idempotent).
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { judgeScorecardRepository } from "../src/lib/repositories/judge-scorecard.repository";

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

  throw new Error(
    `judge-ui-e2e manifest not found. Run npm run setup:judge-ui-e2e first. Tried: ${candidates.join(", ")}`,
  );
}

const manifest = JSON.parse(readFileSync(resolveManifestPath(), "utf8")) as {
  assignedMatchId: string;
  eventId: string;
};

async function main() {
  const match = await prisma.bracketMatch.findUnique({
    where: { id: manifest.assignedMatchId },
    include: {
      bracket: { select: { id: true, eventId: true } },
      fighterRed: { select: { id: true, name: true } },
      fighterBlue: { select: { id: true, name: true } },
    },
  });
  if (!match?.fighterRed || !match.fighterBlue) {
    throw new Error("E2E match missing fighters");
  }

  const event = await prisma.event.findUnique({
    where: { id: manifest.eventId },
    select: { title: true },
  });
  if (!event) throw new Error("Event not found");

  const existing = await prisma.matchResult.count({
    where: {
      matchId: match.id,
      status: "confirmed",
    },
  });

  if (existing < 2) {
    const now = new Date();
    await prisma.matchResult.createMany({
      data: [
        {
          eventId: manifest.eventId,
          bracketId: match.bracket.id,
          matchId: match.id,
          fighterId: match.fighterRed.id,
          opponentFighterId: match.fighterBlue.id,
          result: "win",
          eventTitleSnapshot: event.title,
          fighterSnapshot: { name: match.fighterRed.name },
          opponentSnapshot: { name: match.fighterBlue.name },
          matchDate: now,
          status: "confirmed",
          confirmedAt: now,
        },
        {
          eventId: manifest.eventId,
          bracketId: match.bracket.id,
          matchId: match.id,
          fighterId: match.fighterBlue.id,
          opponentFighterId: match.fighterRed.id,
          result: "loss",
          eventTitleSnapshot: event.title,
          fighterSnapshot: { name: match.fighterBlue.name },
          opponentSnapshot: { name: match.fighterRed.name },
          matchDate: now,
          status: "confirmed",
          confirmedAt: now,
        },
      ],
      skipDuplicates: true,
    });
  }

  await judgeScorecardRepository.lockByMatch(match.id);
  console.log("Match locked for UI E2E:", match.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
