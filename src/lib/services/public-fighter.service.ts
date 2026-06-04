import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { publicAgeGroupFromBirthDate } from "@/lib/public-fighter/age-group";
import { parseRegionFromGymAddress } from "@/lib/public-fighter/region";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import {
  publicFighterRepository,
  type PublicFighterListFilters,
} from "@/lib/repositories/public-fighter.repository";
import type { organizerPublicFighterFiltersSchema } from "@/lib/validators/public-fighter.validator";
import type { z } from "zod";

export type GymFighterPublicSettingsRow = {
  fighterId: string;
  historyId: string;
  isPublicToOrganizers: boolean;
  publicEnabledAtIso: string | null;
  publicMemo: string | null;
};

export type OrganizerPublicFighterListItemDTO = {
  fighterId: string;
  name: string;
  gender: string;
  ageGroup: string;
  weightClassLabel: string;
  recordSummary: string;
  gymId: string;
  gymName: string;
  regionLabel: string;
  sportType: string | null;
  recentEventTitle: string | null;
  publicEnabledAtIso: string | null;
  publicMemo: string | null;
  profileImageUrl: string | null;
};

export type OrganizerPublicFighterDetailDTO = {
  fighterId: string;
  name: string;
  gender: string;
  ageGroup: string;
  weightClassLabel: string;
  heightCm: number | null;
  recordSummary: string;
  gymId: string;
  gymName: string;
  regionLabel: string;
  gymPhone: string | null;
  publicEnabledAtIso: string | null;
  publicMemo: string | null;
  profileImageUrl: string | null;
  recentParticipations: {
    eventTitle: string;
    eventDateIso: string | null;
    divisionLabel: string;
  }[];
};

function formatRecord(win: number, loss: number, draw: number): string {
  if (win === 0 && loss === 0 && draw === 0) return "전적 미등록";
  return `${win}승 ${loss}패 ${draw}무`;
}

function weightLabel(weight: number | null): string {
  if (weight == null) return "미등록";
  return `${weight}kg`;
}

function divisionLabel(d: {
  sportType: string;
  weightClass: string | null;
  ageGroup: string | null;
}): string {
  const parts = [d.sportType, d.ageGroup, d.weightClass].filter(Boolean);
  return parts.join(" · ") || "—";
}

export const publicFighterService = {
  async listGymFighterPublicSettings(
    actor: ActorContext,
  ): Promise<GymFighterPublicSettingsRow[]> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) return [];
    await requireGymOwner(actor, gymId);

    const rows = await publicFighterRepository.listPublicSettingsByGym(gymId);
    return rows.map((r) => ({
      fighterId: r.fighterId,
      historyId: r.id,
      isPublicToOrganizers: r.isPublicToOrganizers,
      publicEnabledAtIso: r.publicEnabledAt?.toISOString() ?? null,
      publicMemo: r.publicMemo,
    }));
  },

  async gymTogglePublicFighter(
    actor: ActorContext,
    input: {
      fighterId: string;
      isPublic: boolean;
      publicMemo?: string;
    },
  ): Promise<void> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) {
      throw new AppError("FORBIDDEN", "체육관 정보가 없습니다.");
    }
    await requireGymOwner(actor, gymId);

    const history = await publicFighterRepository.findActiveHistoryForGymFighter(
      input.fighterId,
      gymId,
    );
    if (!history) {
      throw new AppError(
        "NOT_FOUND",
        "해당 체육관의 활성 소속 이력을 찾을 수 없습니다.",
      );
    }

    await publicFighterRepository.setPublicFlagForActiveHistory({
      historyId: history.id,
      isPublic: input.isPublic,
      publicMemo: input.publicMemo,
    });
  },

  async listPublicFightersForOrganizer(
    actor: ActorContext,
    filtersInput: z.infer<typeof organizerPublicFighterFiltersSchema>,
  ): Promise<{
    items: OrganizerPublicFighterListItemDTO[];
    filterOptions: { gyms: { id: string; name: string; regionLabel: string }[] };
  }> {
    requireRole(actor, ["organizer", "admin"]);

    const filters: PublicFighterListFilters = {
      q: filtersInput.q?.trim() || undefined,
      region: filtersInput.region?.trim() || undefined,
      gymId: filtersInput.gymId?.trim() || undefined,
      gender: filtersInput.gender?.trim() || undefined,
      ageGroup: filtersInput.ageGroup?.trim() || undefined,
      weightClass: filtersInput.weightClass?.trim() || undefined,
      sportType: filtersInput.sportType?.trim() || undefined,
      hasRecentEvent:
        filtersInput.hasRecentEvent === "yes"
          ? true
          : filtersInput.hasRecentEvent === "no"
            ? false
            : undefined,
    };

    const [raw, options] = await Promise.all([
      publicFighterRepository.listPublicFightersForOrganizer(),
      publicFighterRepository.listFilterOptions(),
    ]);

    const eligible = raw.filter((h) => h.fighter.currentGymId === h.gymId);
    const recentMap =
      await publicFighterRepository.listLatestApprovedApplicationByFighters(
        eligible.map((h) => h.fighter.id),
      );

    const items: OrganizerPublicFighterListItemDTO[] = [];

    for (const h of eligible) {
      const region = parseRegionFromGymAddress(h.gym.address);
      const ageGroup = publicAgeGroupFromBirthDate(h.fighter.birthDate);

      const recent = recentMap.get(h.fighter.id);
      const recentEventTitle = recent?.eventTitle ?? null;
      const sportType = recent?.sportType ?? null;

      const row: OrganizerPublicFighterListItemDTO = {
        fighterId: h.fighter.id,
        name: h.fighter.name,
        gender: h.fighter.gender,
        ageGroup,
        weightClassLabel: weightLabel(h.fighter.weight),
        recordSummary: formatRecord(
          h.fighter.recordWin,
          h.fighter.recordLoss,
          h.fighter.recordDraw,
        ),
        gymId: h.gym.id,
        gymName: h.gym.name,
        regionLabel: region.label,
        sportType,
        recentEventTitle,
        publicEnabledAtIso: h.publicEnabledAt?.toISOString() ?? null,
        publicMemo: h.publicMemo,
        profileImageUrl: h.fighter.profileImageUrl,
      };

      if (filters.gymId && row.gymId !== filters.gymId) continue;
      if (filters.gender && row.gender !== filters.gender) continue;
      if (filters.ageGroup && row.ageGroup !== filters.ageGroup) continue;
      if (
        filters.weightClass &&
        !row.weightClassLabel.includes(filters.weightClass)
      ) {
        continue;
      }
      if (filters.region && !row.regionLabel.includes(filters.region)) continue;
      if (filters.sportType && row.sportType !== filters.sportType) continue;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const hay = `${row.name} ${row.gymName} ${row.regionLabel}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (filters.hasRecentEvent === true && !row.recentEventTitle) continue;
      if (filters.hasRecentEvent === false && row.recentEventTitle) continue;

      items.push(row);
    }

    const filterOptions = {
      gyms: options.gyms.map((g) => ({
        id: g.id,
        name: g.name,
        regionLabel: parseRegionFromGymAddress(g.address).label,
      })),
    };

    return { items, filterOptions };
  },

  async getPublicFighterDetail(
    actor: ActorContext,
    fighterId: string,
  ): Promise<OrganizerPublicFighterDetailDTO> {
    requireRole(actor, ["organizer", "admin"]);

    const detail = await publicFighterRepository.findPublicFighterDetail(
      fighterId,
    );
    if (!detail) {
      throw new AppError("NOT_FOUND", "공개 선수를 찾을 수 없습니다.");
    }

    const { history, recentApplications } = detail;
    const region = parseRegionFromGymAddress(history.gym.address);

    return {
      fighterId: history.fighter.id,
      name: history.fighter.name,
      gender: history.fighter.gender,
      ageGroup: publicAgeGroupFromBirthDate(history.fighter.birthDate),
      weightClassLabel: weightLabel(history.fighter.weight),
      heightCm: history.fighter.height,
      recordSummary: formatRecord(
        history.fighter.recordWin,
        history.fighter.recordLoss,
        history.fighter.recordDraw,
      ),
      gymId: history.gym.id,
      gymName: history.gym.name,
      regionLabel: region.label,
      gymPhone: history.gym.phone,
      publicEnabledAtIso: history.publicEnabledAt?.toISOString() ?? null,
      publicMemo: history.publicMemo,
      profileImageUrl: history.fighter.profileImageUrl,
      recentParticipations: recentApplications.map((a) => ({
        eventTitle: a.event.title,
        eventDateIso: a.event.eventDate.toISOString(),
        divisionLabel: divisionLabel(a.division),
      })),
    };
  },
};
