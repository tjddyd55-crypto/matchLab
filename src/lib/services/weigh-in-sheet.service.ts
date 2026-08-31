import "server-only";

import { ApplicationStatus } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { formatApplicationDivisionLabel } from "@/lib/applications/application-division-label";
import { formatPrintGenderShort } from "@/lib/brackets/bracket-print-format";
import { formatUtcDateOnly } from "@/lib/date-only";
import {
  resolvePersistedMatchDivisionLabel,
  resolveWeighInWeightLabel,
} from "@/lib/event-division-fields";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  buildWeighInSheetFilename,
  formatWeighInSheetApplicationWeightKg,
  type WeighInSheetAthleteRow,
  type WeighInSheetDocument,
  type WeighInSheetGymGroup,
} from "@/lib/weigh-in/weigh-in-sheet";

function readApplicationWeightKg(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  const raw = (snapshot as Record<string, unknown>).applicationWeightKg;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readSnapshotName(snapshot: unknown): string | null {
  if (
    snapshot &&
    typeof snapshot === "object" &&
    "name" in snapshot &&
    typeof (snapshot as { name: unknown }).name === "string"
  ) {
    const name = (snapshot as { name: string }).name.trim();
    return name || null;
  }
  return null;
}

function compareKo(a: string, b: string): number {
  return a.localeCompare(b, "ko");
}

export const weighInSheetService = {
  async getOrganizerWeighInSheetDocument(
    actor: ActorContext,
    eventId: string,
  ): Promise<WeighInSheetDocument> {
    await requireOrganizerForEvent(actor, eventId);

    const [event, rows] = await Promise.all([
      prisma.event.findUniqueOrThrow({
        where: { id: eventId },
        select: { id: true, title: true, eventDate: true },
      }),
      prisma.eventApplication.findMany({
        where: {
          eventId,
          status: ApplicationStatus.approved,
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          gymId: true,
          gymSnapshot: true,
          gymNameSnapshot: true,
          fighterSnapshot: true,
          divisionSelectionType: true,
          requestedDivisionText: true,
          fighter: {
            select: {
              name: true,
              gender: true,
              birthDate: true,
            },
          },
          gym: {
            select: { name: true },
          },
          division: {
            select: {
              sportType: true,
              ruleType: true,
              gender: true,
              ageGroup: true,
              weightClass: true,
              weightClassName: true,
              weightLimitText: true,
              skillLevel: true,
            },
          },
        },
      }),
    ]);

    const printedAt = new Date();
    const groupMap = new Map<string, WeighInSheetGymGroup>();

    for (const row of rows) {
      const gymName = resolveApplicationGymDisplayName({
        gymSnapshot: row.gymSnapshot,
        gymRelationName: row.gym?.name,
        gymNameSnapshot: row.gymNameSnapshot,
      });
      const gymKey = row.gymId ?? `name:${gymName}`;

      const ageGroup = resolvePersistedMatchDivisionLabel(row.division);
      const divisionCategoryLabel =
        row.divisionSelectionType === "OTHER"
          ? formatApplicationDivisionLabel({
              division: row.division,
              divisionSelectionType: row.divisionSelectionType,
              requestedDivisionText: row.requestedDivisionText,
            })
          : ageGroup ??
            formatApplicationDivisionLabel({
              division: row.division,
              divisionSelectionType: row.divisionSelectionType,
              requestedDivisionText: row.requestedDivisionText,
            });

      const weightClassLabel = row.division
        ? resolveWeighInWeightLabel(row.division) ?? "—"
        : "—";

      const athlete: WeighInSheetAthleteRow = {
        applicationId: row.id,
        fighterName:
          row.fighter.name?.trim() ||
          readSnapshotName(row.fighterSnapshot) ||
          "—",
        genderLabel: formatPrintGenderShort(row.fighter.gender),
        birthDateLabel: row.fighter.birthDate
          ? formatUtcDateOnly(row.fighter.birthDate, ".")
          : "—",
        divisionCategoryLabel: divisionCategoryLabel || "—",
        weightClassLabel,
        applicationWeightLabel: formatWeighInSheetApplicationWeightKg(
          readApplicationWeightKg(row.fighterSnapshot),
        ),
      };

      const existing = groupMap.get(gymKey);
      if (existing) {
        existing.athletes.push(athlete);
      } else {
        groupMap.set(gymKey, {
          gymKey,
          gymName,
          athletes: [athlete],
        });
      }
    }

    const groups = [...groupMap.values()].sort((a, b) =>
      compareKo(a.gymName, b.gymName),
    );
    for (const g of groups) {
      g.athletes.sort((a, b) => compareKo(a.fighterName, b.fighterName));
    }

    const documentTitle = `${event.title}_계체기록지`;

    return {
      eventId: event.id,
      eventTitle: event.title,
      eventDateLabel: formatUtcDateOnly(event.eventDate, "."),
      printedAtLabel: formatUtcDateOnly(printedAt, "."),
      documentTitle,
      groups,
    };
  },

  buildDownloadFilename(eventTitle: string, printedAt = new Date()): string {
    return buildWeighInSheetFilename({ eventTitle, printedAt });
  },
};
