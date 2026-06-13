/**
 * UI E2E용 배정 경기 MatchResult 확정 (additive only, idempotent).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { judgeScorecardRepository } from "../src/lib/repositories/judge-scorecard.repository";

const manifest = JSON.parse(
  readFileSync("/tmp/judge-ui-e2e-manifest.json", "utf8"),
) as { assignedMatchId: string; eventId: string };

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
