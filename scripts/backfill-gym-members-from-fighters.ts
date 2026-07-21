/**
 * Legacy Fighter → GymMember backfill (additive, non-destructive, idempotent).
 *
 * Usage (after schema push):
 *   DRY_RUN=1 npx tsx scripts/backfill-gym-members-from-fighters.ts
 *   npx tsx scripts/backfill-gym-members-from-fighters.ts
 *
 * Match policy (same gym only):
 *   1) normalizedPhone exact + name exact → link existing member
 *   2) name + birthDate exact → link existing member
 *   3) otherwise create new GymMember
 * Never merge on name-only or phone-only (different name).
 * Never assign gym for fighters without currentGymId.
 *
 * Writes: tmp-gym-member-backfill-report.json
 */
import { writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, GymMemberStatus } from "../src/generated/prisma";
import { normalizePhoneDigits } from "../src/lib/phone";
import { toUtcDateOnly } from "../src/lib/date-only";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const DATABASE_URL = process.env.DATABASE_URL?.trim();

if (!DATABASE_URL) {
  console.error("FAIL: DATABASE_URL required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "0"
      ? undefined
      : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type CoreCounts = {
  Gym: number;
  Fighter: number;
  FighterGymHistory: number;
  User: number;
  Event: number;
  EventApplication: number;
  Bracket: number;
  BracketMatch: number;
  MatchResult: number;
  GymMember: number;
  GymMembershipPlan: number;
  GymMemberSubscription: number;
  GymMemberPayment: number;
  fightersWithGym: number;
  fightersLinked: number;
  fightersNoGym: number;
};

type Report = {
  dryRun: boolean;
  before: CoreCounts;
  after: CoreCounts;
  createdMembers: number;
  linkedExisting: number;
  unchanged: number;
  phoneNameMatches: number;
  nameBirthMatches: number;
  skippedNoGym: Array<{ fighterId: string; name: string }>;
  ambiguous: Array<{
    fighterId: string;
    name: string;
    gymId: string;
    reason: string;
  }>;
  byGym: Record<string, { create: number; link: number }>;
  errors: Array<{ fighterId: string; message: string }>;
};

async function coreCounts(): Promise<CoreCounts> {
  const [
    Gym,
    Fighter,
    FighterGymHistory,
    User,
    Event,
    EventApplication,
    Bracket,
    BracketMatch,
    MatchResult,
    GymMember,
    GymMembershipPlan,
    GymMemberSubscription,
    GymMemberPayment,
    fightersWithGym,
    fightersLinked,
    fightersNoGym,
  ] = await Promise.all([
    prisma.gym.count(),
    prisma.fighter.count(),
    prisma.fighterGymHistory.count(),
    prisma.user.count(),
    prisma.event.count(),
    prisma.eventApplication.count(),
    prisma.bracket.count(),
    prisma.bracketMatch.count(),
    prisma.matchResult.count(),
    prisma.gymMember.count(),
    prisma.gymMembershipPlan.count(),
    prisma.gymMemberSubscription.count(),
    prisma.gymMemberPayment.count(),
    prisma.fighter.count({ where: { currentGymId: { not: null } } }),
    prisma.fighter.count({ where: { gymMemberId: { not: null } } }),
    prisma.fighter.count({ where: { currentGymId: null } }),
  ]);
  return {
    Gym,
    Fighter,
    FighterGymHistory,
    User,
    Event,
    EventApplication,
    Bracket,
    BracketMatch,
    MatchResult,
    GymMember,
    GymMembershipPlan,
    GymMemberSubscription,
    GymMemberPayment,
    fightersWithGym,
    fightersLinked,
    fightersNoGym,
  };
}

async function nextMemberNumber(
  gymId: string,
  used: Map<string, number>,
): Promise<string> {
  let seq = used.get(gymId);
  if (seq == null) {
    const last = await prisma.gymMember.findFirst({
      where: { gymId },
      orderBy: { memberNumber: "desc" },
      select: { memberNumber: true },
    });
    seq = 0;
    if (last?.memberNumber) {
      const m = /^M-(\d+)$/.exec(last.memberNumber);
      if (m) seq = Number(m[1]);
    }
  }
  seq += 1;
  used.set(gymId, seq);
  return `M-${String(seq).padStart(6, "0")}`;
}

function namesEqual(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

async function main() {
  const before = await coreCounts();
  const report: Report = {
    dryRun: DRY_RUN,
    before,
    after: before,
    createdMembers: 0,
    linkedExisting: 0,
    unchanged: 0,
    phoneNameMatches: 0,
    nameBirthMatches: 0,
    skippedNoGym: [],
    ambiguous: [],
    byGym: {},
    errors: [],
  };

  const fighters = await prisma.fighter.findMany({
    where: { gymMemberId: null },
    select: {
      id: true,
      name: true,
      phone: true,
      birthDate: true,
      gender: true,
      currentGymId: true,
      guardianName: true,
      guardianPhone: true,
      primarySport: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Already linked → unchanged
  report.unchanged = before.fightersLinked;

  const seqByGym = new Map<string, number>();

  for (const f of fighters) {
    try {
      if (!f.currentGymId) {
        report.skippedNoGym.push({ fighterId: f.id, name: f.name });
        continue;
      }

      const gymId = f.currentGymId;
      if (!report.byGym[gymId]) report.byGym[gymId] = { create: 0, link: 0 };

      const phone = normalizePhoneDigits(f.phone);
      const unlinkedMembers = await prisma.gymMember.findMany({
        where: {
          gymId,
          deletedAt: null,
          fighter: { is: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          normalizedPhone: true,
          birthDate: true,
        },
        take: 200,
      });

      const phoneNameMatches = unlinkedMembers.filter(
        (m) =>
          phone.length > 0 &&
          (m.normalizedPhone === phone ||
            normalizePhoneDigits(m.phone) === phone) &&
          namesEqual(m.name, f.name),
      );

      const nameBirthMatches = unlinkedMembers.filter(
        (m) =>
          namesEqual(m.name, f.name) &&
          m.birthDate &&
          toUtcDateOnly(m.birthDate).getTime() ===
            toUtcDateOnly(f.birthDate).getTime(),
      );

      let targetMemberId: string | null = null;
      let matchKind: "phone_name" | "name_birth" | null = null;

      if (phoneNameMatches.length === 1) {
        targetMemberId = phoneNameMatches[0]!.id;
        matchKind = "phone_name";
      } else if (phoneNameMatches.length > 1) {
        report.ambiguous.push({
          fighterId: f.id,
          name: f.name,
          gymId,
          reason: "multiple_phone_name_matches",
        });
      } else if (nameBirthMatches.length === 1) {
        // phone-only different-name matches are ignored by design
        targetMemberId = nameBirthMatches[0]!.id;
        matchKind = "name_birth";
      } else if (nameBirthMatches.length > 1) {
        report.ambiguous.push({
          fighterId: f.id,
          name: f.name,
          gymId,
          reason: "multiple_name_birth_matches",
        });
      }

      if (DRY_RUN) {
        if (targetMemberId && matchKind) {
          report.linkedExisting += 1;
          report.byGym[gymId]!.link += 1;
          if (matchKind === "phone_name") report.phoneNameMatches += 1;
          else report.nameBirthMatches += 1;
        } else if (!report.ambiguous.some((a) => a.fighterId === f.id)) {
          report.createdMembers += 1;
          report.byGym[gymId]!.create += 1;
        } else {
          // ambiguous → still plan to create separate member (no silent merge)
          report.createdMembers += 1;
          report.byGym[gymId]!.create += 1;
        }
        continue;
      }

      if (targetMemberId && matchKind) {
        await prisma.fighter.update({
          where: { id: f.id },
          data: { gymMemberId: targetMemberId },
        });
        report.linkedExisting += 1;
        report.byGym[gymId]!.link += 1;
        if (matchKind === "phone_name") report.phoneNameMatches += 1;
        else report.nameBirthMatches += 1;
        continue;
      }

      const memberNumber = await nextMemberNumber(gymId, seqByGym);
      const member = await prisma.gymMember.create({
        data: {
          gymId,
          memberNumber,
          name: f.name,
          phone: phone || f.phone,
          normalizedPhone: phone || normalizePhoneDigits(f.phone) || f.phone,
          birthDate: f.birthDate,
          gender: f.gender,
          guardianName: f.guardianName,
          guardianPhone: f.guardianPhone,
          primarySport: f.primarySport,
          joinedAt: f.createdAt,
          status: GymMemberStatus.active,
        },
      });
      await prisma.fighter.update({
        where: { id: f.id },
        data: { gymMemberId: member.id },
      });
      report.createdMembers += 1;
      report.byGym[gymId]!.create += 1;
    } catch (e) {
      report.errors.push({
        fighterId: f.id,
        message: e instanceof Error ? e.message : String(e),
      });
      // Fail fast on apply — do not silently continue
      if (!DRY_RUN) {
        report.after = await coreCounts();
        writeFileSync(
          "tmp-gym-member-backfill-report.json",
          JSON.stringify(report, null, 2),
        );
        console.error("BACKFILL_FAIL_ROW", f.id);
        throw e;
      }
    }
  }

  report.after = await coreCounts();
  writeFileSync(
    "tmp-gym-member-backfill-report.json",
    JSON.stringify(report, null, 2),
  );

  console.log(
    DRY_RUN ? "BACKFILL_DRY_RUN_OK" : "BACKFILL_OK",
    JSON.stringify({
      created: report.createdMembers,
      linked: report.linkedExisting,
      unchanged: report.unchanged,
      skippedNoGym: report.skippedNoGym.length,
      ambiguous: report.ambiguous.length,
      errors: report.errors.length,
      afterLinked: report.after.fightersLinked,
      afterMembers: report.after.GymMember,
      coreUnchanged:
        report.after.Fighter === report.before.Fighter &&
        report.after.EventApplication === report.before.EventApplication &&
        report.after.BracketMatch === report.before.BracketMatch &&
        report.after.MatchResult === report.before.MatchResult &&
        report.after.User === report.before.User,
    }),
  );

  if (report.errors.length > 0 && !DRY_RUN) process.exit(1);
}

main()
  .catch((e) => {
    console.error("BACKFILL_FAIL", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  });
