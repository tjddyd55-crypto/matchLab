/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import {
  ApplicationStatus,
  FighterStatus,
  MatchRecordOutcome,
  MatchRecordStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const COUNTABLE_STATUSES: MatchRecordStatus[] = [
  MatchRecordStatus.confirmed,
  MatchRecordStatus.corrected,
];

const OUTCOME_LABEL: Record<MatchRecordOutcome, string> = {
  win: "승",
  loss: "패",
  draw: "무",
  no_contest: "무효",
};

export const fighterProfileRepository = {
  async findByFighterId(fighterId: string) {
    return prisma.fighterProfile.findUnique({
      where: { fighterId },
    });
  },

  async findPublicBySlug(slug: string) {
    return prisma.fighterProfile.findFirst({
      where: {
        slug,
        isPublic: true,
        fighter: {
          status: FighterStatus.active,
          currentGymId: { not: null },
        },
      },
      include: {
        fighter: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            weight: true,
            primarySport: true,
            recordWin: true,
            recordLoss: true,
            recordDraw: true,
            profileImageUrl: true,
            currentGym: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });
  },

  async listRecentPublicResults(fighterId: string, take = 5) {
    const rows = await prisma.matchResult.findMany({
      where: {
        fighterId,
        status: { in: COUNTABLE_STATUSES },
        result: { not: MatchRecordOutcome.no_contest },
      },
      orderBy: { matchDate: "desc" },
      take,
      select: {
        eventTitleSnapshot: true,
        matchDate: true,
        result: true,
        resultType: true,
      },
    });

    return rows.map((r) => ({
      eventTitle: r.eventTitleSnapshot,
      matchDateIso: r.matchDate.toISOString(),
      outcomeLabel: OUTCOME_LABEL[r.result],
      resultType: r.resultType,
    }));
  },

  async listRecentApprovedEvents(fighterId: string, take = 5) {
    const rows = await prisma.eventApplication.findMany({
      where: {
        fighterId,
        status: ApplicationStatus.approved,
      },
      orderBy: { appliedAt: "desc" },
      take,
      select: {
        event: { select: { title: true, eventDate: true } },
        division: {
          select: {
            sportType: true,
            weightClass: true,
            ageGroup: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      eventTitle: r.event.title,
      eventDateIso: r.event.eventDate?.toISOString() ?? null,
      divisionLabel: [r.division?.sportType, r.division?.ageGroup, r.division?.weightClass]
        .filter(Boolean)
        .join(" · ") || "체급 미지정",
    }));
  },

  async isSlugTaken(slug: string, excludeFighterId?: string): Promise<boolean> {
    const row = await prisma.fighterProfile.findUnique({
      where: { slug },
      select: { fighterId: true },
    });
    if (!row) return false;
    if (excludeFighterId && row.fighterId === excludeFighterId) return false;
    return true;
  },

  async upsertForFighter(
    fighterId: string,
    data: {
      displayName?: string | null;
      bio?: string | null;
      snsInstagram?: string | null;
      snsYoutube?: string | null;
      snsTiktok?: string | null;
      profileImageUrl?: string | null;
      profileImagePath?: string | null;
      isPublic?: boolean;
      slug?: string;
      publicEnabledAt?: Date | null;
    },
  ) {
    const slug =
      data.slug ??
      (await this.findByFighterId(fighterId))?.slug ??
      `f-${fighterId.slice(-8)}`;

    return prisma.fighterProfile.upsert({
      where: { fighterId },
      create: {
        fighterId,
        slug,
        displayName: data.displayName ?? null,
        bio: data.bio ?? null,
        snsInstagram: data.snsInstagram ?? null,
        snsYoutube: data.snsYoutube ?? null,
        snsTiktok: data.snsTiktok ?? null,
        profileImageUrl: data.profileImageUrl ?? null,
        profileImagePath: data.profileImagePath ?? null,
        isPublic: data.isPublic ?? false,
        publicEnabledAt: data.isPublic ? new Date() : null,
      },
      update: {
        displayName: data.displayName,
        bio: data.bio,
        snsInstagram: data.snsInstagram,
        snsYoutube: data.snsYoutube,
        snsTiktok: data.snsTiktok,
        profileImageUrl: data.profileImageUrl,
        profileImagePath: data.profileImagePath,
        isPublic: data.isPublic,
        publicEnabledAt:
          data.isPublic === true
            ? data.publicEnabledAt ?? new Date()
            : data.isPublic === false
              ? null
              : undefined,
        ...(data.slug ? { slug: data.slug } : {}),
      },
    });
  },
};
