import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { publicAgeGroupFromBirthDate } from "@/lib/public-fighter/age-group";
import { parseRegionFromGymAddress } from "@/lib/public-fighter/region";
import { requireRole } from "@/lib/permissions";
import { fighterProfileRepository } from "@/lib/repositories/fighter-profile.repository";
import { prisma } from "@/lib/prisma";
import type { FighterProfileUpdateInput } from "@/lib/validators/fighter-profile.validator";

function slugifyBase(name: string, fighterId: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .slice(0, 24);
  const suffix = fighterId.slice(-6);
  return `${base || "fighter"}-${suffix}`.replace(/[^a-z0-9-]/g, "");
}

function buildPublicProfileUrl(slug: string, isPublic: boolean): string | null {
  if (!isPublic) return null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return baseUrl ? `${baseUrl}/fighters/${slug}` : `/fighters/${slug}`;
}

export type FighterProfileEditorDTO = {
  fighterId: string;
  name: string;
  gymName: string | null;
  regionLabel: string;
  gender: string;
  ageGroup: string;
  weightLabel: string;
  primarySport: string | null;
  recordSummary: string;
  displayName: string;
  bio: string;
  snsInstagram: string;
  snsYoutube: string;
  snsTiktok: string;
  profileImageUrl: string | null;
  /** 편집 폼 hidden용 — 공개 DTO에는 포함하지 않음 */
  profileImagePath: string | null;
  isPublic: boolean;
  slug: string;
  publicProfileUrl: string | null;
};

export type PublicFighterRecentResultDTO = {
  eventTitle: string;
  matchDateIso: string;
  outcomeLabel: string;
};

export type PublicFighterRecentEventDTO = {
  eventTitle: string;
  eventDateIso: string | null;
  divisionLabel: string;
};

export type PublicFighterProfileDTO = {
  slug: string;
  displayName: string;
  gymName: string | null;
  regionLabel: string;
  gender: string;
  ageGroup: string;
  weightLabel: string;
  primarySport: string | null;
  recordSummary: string;
  bio: string | null;
  snsInstagram: string | null;
  snsYoutube: string | null;
  snsTiktok: string | null;
  profileImageUrl: string | null;
  recentResults: PublicFighterRecentResultDTO[];
  recentEvents: PublicFighterRecentEventDTO[];
};

export const fighterProfileService = {
  async getEditor(actor: ActorContext): Promise<FighterProfileEditorDTO> {
    requireRole(actor, ["fighter", "admin"]);
    if (!actor.fighterId) {
      throw new AppError(
        "FORBIDDEN",
        "선수 계정이 등록 선수와 연결되지 않았습니다. 체육관에 문의하세요.",
      );
    }

    const fighter = await prisma.fighter.findUnique({
      where: { id: actor.fighterId },
      include: {
        currentGym: { select: { name: true, address: true } },
        fighterProfile: true,
      },
    });
    if (!fighter) {
      throw new AppError("NOT_FOUND", "선수 정보를 찾을 수 없습니다.");
    }

    const profile = fighter.fighterProfile;
    const slug =
      profile?.slug ?? slugifyBase(fighter.name, fighter.id);
    const isPublic = profile?.isPublic ?? false;

    return {
      fighterId: fighter.id,
      name: fighter.name,
      gymName: fighter.currentGym?.name ?? null,
      regionLabel: parseRegionFromGymAddress(fighter.currentGym?.address ?? null)
        .label,
      gender: fighter.gender,
      ageGroup: publicAgeGroupFromBirthDate(fighter.birthDate),
      weightLabel:
        fighter.weight != null ? `${fighter.weight}kg` : "미등록",
      primarySport: fighter.primarySport,
      recordSummary: `${fighter.recordWin}승 ${fighter.recordLoss}패 ${fighter.recordDraw}무`,
      displayName: profile?.displayName ?? fighter.name,
      bio: profile?.bio ?? "",
      snsInstagram: profile?.snsInstagram ?? "",
      snsYoutube: profile?.snsYoutube ?? "",
      snsTiktok: profile?.snsTiktok ?? "",
      profileImageUrl: profile?.profileImageUrl ?? fighter.profileImageUrl,
      profileImagePath: profile?.profileImagePath ?? null,
      isPublic,
      slug,
      publicProfileUrl: buildPublicProfileUrl(slug, isPublic),
    };
  },

  async updateProfile(
    actor: ActorContext,
    input: FighterProfileUpdateInput,
  ): Promise<{ publicProfileUrl: string | null }> {
    requireRole(actor, ["fighter", "admin"]);
    if (!actor.fighterId) {
      throw new AppError("FORBIDDEN", "선수 계정 연결이 필요합니다.");
    }

    const fighterName =
      (
        await prisma.fighter.findUnique({
          where: { id: actor.fighterId },
          select: { name: true },
        })
      )?.name ?? "fighter";
    let slug = input.slug?.trim() || slugifyBase(fighterName, actor.fighterId);
    if (await fighterProfileRepository.isSlugTaken(slug, actor.fighterId)) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const fighterId = actor.fighterId;
    if (input.profileImagePath) {
      const prefix = `fighters/${fighterId}/`;
      if (!input.profileImagePath.startsWith(prefix)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "프로필 이미지 경로가 올바르지 않습니다. 다시 업로드해 주세요.",
        );
      }
    }

    await fighterProfileRepository.upsertForFighter(fighterId, {
      displayName: input.displayName,
      bio: input.bio,
      snsInstagram: input.snsInstagram,
      snsYoutube: input.snsYoutube,
      snsTiktok: input.snsTiktok,
      profileImageUrl: input.profileImageUrl,
      profileImagePath: input.profileImagePath,
      isPublic: input.isPublic,
      slug,
    });

    // 체육관·주최자 목록 등 Fighter.profileImageUrl 캐시 동기화
    await prisma.fighter.update({
      where: { id: fighterId },
      data: { profileImageUrl: input.profileImageUrl },
    });

    return {
      publicProfileUrl: buildPublicProfileUrl(slug, input.isPublic),
    };
  },

  async getPublicBySlug(slug: string): Promise<PublicFighterProfileDTO | null> {
    const row = await fighterProfileRepository.findPublicBySlug(slug);
    if (!row?.fighter) return null;

    const f = row.fighter;
    const [recentResults, recentEvents] = await Promise.all([
      fighterProfileRepository.listRecentPublicResults(f.id),
      fighterProfileRepository.listRecentApprovedEvents(f.id),
    ]);

    return {
      slug: row.slug,
      displayName: row.displayName ?? f.name,
      gymName: f.currentGym?.name ?? null,
      regionLabel: parseRegionFromGymAddress(f.currentGym?.address ?? null)
        .label,
      gender: f.gender,
      ageGroup: publicAgeGroupFromBirthDate(f.birthDate),
      weightLabel: f.weight != null ? `${f.weight}kg` : "—",
      primarySport: f.primarySport,
      recordSummary: `${f.recordWin}승 ${f.recordLoss}패 ${f.recordDraw}무`,
      bio: row.bio,
      snsInstagram: row.snsInstagram,
      snsYoutube: row.snsYoutube,
      snsTiktok: row.snsTiktok,
      profileImageUrl: row.profileImageUrl ?? f.profileImageUrl,
      recentResults,
      recentEvents,
    };
  },
};
