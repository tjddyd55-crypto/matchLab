/** 브래킷 매치 JSON 스냅샷에 저장되는 공개 가능 필드 집합. */
import { formatDivisionSearchLabel } from "@/lib/event-division-fields";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";

export type BracketFighterSnapshotPayload = {
  fighterId: string;
  fighterCode: string;
  name: string;
  gymName: string | null;
  profileImageUrl: string | null;
  recordSummary: string;
  divisionName: string | null;
};

export type BracketFighterSnapshotSource = {
  fighter: {
    id: string;
    fighterCode: string;
    name: string;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
  };
  division: {
    sportType: string | null;
    ruleType: string | null;
    gender: string | null;
    ageGroup: string | null;
    weightClass: string | null;
    weightClassName?: string | null;
    weightLimitText?: string | null;
    skillLevel: string | null;
  };
  /** 이미 resolve된 표시명 또는 Gym.relation name */
  gym: { name: string } | null;
  /** EventApplication.gymSnapshot — 있으면 표시 SSOT 우선 */
  gymSnapshot?: unknown;
  gymNameSnapshot?: string | null;
};

export function formatDivisionNameLabel(d: {
  sportType: string | null;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  weightClassName?: string | null;
  weightLimitText?: string | null;
  skillLevel: string | null;
}): string {
  return formatDivisionSearchLabel(d);
}

export function formatRecordSummary(f: {
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
}): string {
  return `${f.recordWin}승 ${f.recordLoss}패 ${f.recordDraw}무`;
}

export function buildFighterBracketSnapshot(
  row: BracketFighterSnapshotSource,
): BracketFighterSnapshotPayload {
  const gymName = resolveApplicationGymDisplayName({
    gymNameSnapshot: row.gymNameSnapshot,
    gymSnapshot: row.gymSnapshot,
    gymRelationName: row.gym?.name,
  });
  return {
    fighterId: row.fighter.id,
    fighterCode: row.fighter.fighterCode,
    name: row.fighter.name,
    gymName: gymName === "—" ? null : gymName,
    profileImageUrl: row.fighter.profileImageUrl,
    recordSummary: formatRecordSummary(row.fighter),
    divisionName: formatDivisionNameLabel(row.division),
  };
}

/** DB Json 스냅샷을 공개·편집 화면용으로 정규화한다. */
export function parseBracketFighterSnapshot(
  raw: unknown,
): BracketFighterSnapshotPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.fighterId !== "string" || typeof o.name !== "string") {
    return null;
  }
  return {
    fighterId: o.fighterId,
    fighterCode: typeof o.fighterCode === "string" ? o.fighterCode : "",
    name: o.name,
    gymName: typeof o.gymName === "string" ? o.gymName : null,
    profileImageUrl:
      typeof o.profileImageUrl === "string" ? o.profileImageUrl : null,
    recordSummary:
      typeof o.recordSummary === "string" ? o.recordSummary : "0승 0패 0무",
    divisionName: typeof o.divisionName === "string" ? o.divisionName : null,
  };
}
