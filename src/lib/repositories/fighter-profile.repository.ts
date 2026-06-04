/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import { prisma } from "@/lib/prisma";

export const fighterProfileRepository = {
  async findByFighterId(fighterId: string) {
    return prisma.fighterProfile.findUnique({
      where: { fighterId },
    });
  },

  async findPublicBySlug(slug: string) {
    return prisma.fighterProfile.findFirst({
      where: { slug, isPublic: true },
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
