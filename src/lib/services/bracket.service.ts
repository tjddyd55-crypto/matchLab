import "server-only";

import {
  ApplicationStatus,
  BracketChangeType,
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  BracketStatus,
  BracketType,
  MatchRecordStatus,
  NextMatchSlot,
  Prisma,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  buildFighterBracketSnapshot,
  formatDivisionNameLabel,
  parseBracketFighterSnapshot,
  type BracketFighterSnapshotPayload,
  type BracketFighterSnapshotSource,
} from "@/lib/bracket-snapshot";
import { computeBracketAssignability } from "@/lib/bracket-assignability";
import { formatApplicationDivisionLabel } from "@/lib/applications/application-division-label";
import {
  formatDivisionMainLabel,
  formatAutoBracketGroupTitle,
  formatBracketTitleForDisplay,
  toEventDivisionDisplayInput,
  type EventDivisionDisplayInput,
} from "@/lib/event-division-fields";
import { computeFieldEligibility } from "@/lib/field-eligibility";
import { validateMatchListPlacement } from "@/lib/bracket-match-placement";
import {
  buildOrderSwapPatches,
  formatMatchOrderShort,
  sortMatchesByOrder,
} from "@/lib/match-order-display";
import type {
  PublicBracketDetailDTO,
  PublicBracketFighterDTO,
  PublicBracketMatchDTO,
} from "@/lib/dto/public";
import {
  buildFighterHandicapMap,
  type FighterHandicapMapEntry,
} from "@/lib/fighter-handicap-display";
import { AppError } from "@/lib/errors/app-error";

const BRACKET_MUTATION_TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;
import { resolveMatchIsPublicSparring } from "@/lib/match-bout-settings";
import {
  formatOperationalSettingsLabel,
  parseMatchOperationalSettings,
} from "@/lib/match-operational-settings";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  bracketRepository,
  type BracketOwnershipContext,
} from "@/lib/repositories/bracket.repository";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { eventCourtRepository } from "@/lib/repositories/event-court.repository";
import { matchRepository } from "@/lib/repositories/match.repository";
import {
  eventWideMatchNumbersNeedResequence,
  renumberAllCourtOrders,
  renumberEventWideMatchNumbers,
  sortMatchesByCourtSchedule,
} from "@/lib/court-match-order";
import { eventRepository } from "@/lib/repositories/event.repository";
import { notificationRepository } from "@/lib/repositories/notification.repository";
import { safeNotify, tryNotify } from "@/lib/notifications/safe-dispatch";
import { notificationService } from "@/lib/services/notification.service";
import { fieldStatusService } from "@/lib/services/field-status.service";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import type { ApprovedApplicationForBracketRow } from "@/lib/repositories/bracket.repository";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";
import { formatPreviewApplicationRecord } from "@/lib/brackets/explain-record-unmatched";
import { eventCourtService } from "@/lib/services/event-court.service";
import {
  buildMultiMatchAssignmentSignature,
  isMultiMatchConfirmationValid,
  type BracketDuplicateAssignmentIssue,
  type BracketDuplicateMatchDetail,
} from "@/lib/brackets/bracket-duplicate-validation";
import type {
  AssignFighterToMatchInput,
  CreateBracketInput,
  CreateMatchListMatchesInput,
  CreateSingleEliminationDraftInput,
  DeleteBracketMatchInput,
  EnsureBracketForDivisionInput,
  RemoveFighterFromMatchInput,
  ResetBracketInput,
  UpdateMatchOrderAndMatInput,
} from "@/lib/validators/bracket.validator";

function reasonFor(changeType: BracketChangeType, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  switch (changeType) {
    case BracketChangeType.bracket_created:
      return "대진표가 생성되었습니다.";
    case BracketChangeType.bracket_published:
      return "대진표가 공개되었습니다.";
    case BracketChangeType.bracket_unpublished:
      return "대진표 공개가 해제되었습니다.";
    case BracketChangeType.fighter_assigned:
      return "선수가 매치에 배치되었습니다.";
    case BracketChangeType.fighter_removed:
      return "매치에서 선수가 제거되었습니다.";
    case BracketChangeType.opponent_changed:
      return "매치 상대 슬롯이 변경되었습니다.";
    case BracketChangeType.match_order_changed:
      return "경기 순서가 변경되었습니다.";
    case BracketChangeType.global_order_changed:
      return "전체 순서가 변경되었습니다.";
    case BracketChangeType.mat_changed:
      return "매트 번호가 변경되었습니다.";
    case BracketChangeType.bracket_reset:
      return "대진표 매치 구성이 초기화되었습니다.";
    default:
      return "대진표가 변경되었습니다.";
  }
}

function readApplicationWeightKg(
  fighterSnapshot: unknown,
  weighInWeightKg: number | null,
): number | null {
  if (
    fighterSnapshot &&
    typeof fighterSnapshot === "object" &&
    !Array.isArray(fighterSnapshot)
  ) {
    const raw = (fighterSnapshot as Record<string, unknown>).applicationWeightKg;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim()) {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  }
  return weighInWeightKg;
}

function mapApplicationToApprovedOption(
  a: ApprovedApplicationForBracketRow,
  field: FieldStatusRowDTO | undefined,
  bracketDivisionId: string | null,
): OrganizerApprovedFighterOptionVM {
  const divisionInput = toEventDivisionDisplayInput(a.division);
  const fieldEligibility = field
    ? computeFieldEligibility({
        checkInStatus: field.checkInStatus,
        weighInStatus: field.weighInStatus,
        weighInFailureResolution: field.weighInFailureResolution,
      })
    : null;
  const assignability = field
    ? computeBracketAssignability({
        checkInStatus: field.checkInStatus,
        weighInStatus: field.weighInStatus,
        weighInFailureResolution: field.weighInFailureResolution,
        applicationStatus: "approved",
        weighInWeightKg: field.weighInWeightKg,
      })
    : computeBracketAssignability({
        checkInStatus: "pending",
        weighInStatus: "pending",
        applicationStatus: "approved",
      });
  const currentDivisionLabel = divisionInput
    ? formatDivisionMainLabel(divisionInput)
    : "체급 미지정";
  const appliedDivisionLabel = formatApplicationDivisionLabel({
    division: divisionInput,
    divisionSelectionType:
      a.divisionSelectionType === "OTHER" ||
      a.divisionSelectionType === "REGISTERED"
        ? a.divisionSelectionType
        : null,
    requestedDivisionText: a.requestedDivisionText,
  });

  return {
    applicationId: a.id,
    fighterId: a.fighter.id,
    label: `${resolveApplicationGymDisplayName({
      gymNameSnapshot: a.gymNameSnapshot,
      gymSnapshot: a.gymSnapshot,
      gymRelationName: a.gym?.name,
    })} · ${a.fighter.name}`,
    divisionId: a.divisionId,
    divisionLabel: currentDivisionLabel,
    appliedDivisionLabel,
    currentDivisionLabel,
    isOtherDivision: Boolean(
      bracketDivisionId && a.divisionId && a.divisionId !== bracketDivisionId,
    ),
    division: divisionInput ?? {
      sportType: null,
      ruleType: null,
      gender: null,
      ageGroup: null,
      weightClass: null,
      weightClassName: null,
      weightLimitText: null,
      skillLevel: null,
    },
    fighterName: a.fighter.name,
    gymName: resolveApplicationGymDisplayName({
      gymNameSnapshot: a.gymNameSnapshot,
      gymSnapshot: a.gymSnapshot,
      gymRelationName: a.gym?.name,
    }),
    fighterGender: a.fighter.gender ?? null,
    isEligibleForBracket: fieldEligibility?.isEligibleForBracket ?? false,
    eligibilityLabel: fieldEligibility?.eligibilityLabel ?? "현장 미확인",
    eligibilityReason:
      fieldEligibility?.eligibilityReason ??
      "현장 확인·계체 상태가 아직 기록되지 않았습니다.",
    isAssignableForBracket: assignability.isAssignable,
    assignabilityLabel: assignability.label,
    assignabilityDisabledReason: assignability.disabledReason,
    assignabilityWarningReason: assignability.warningReason,
    recordSummary: formatPreviewApplicationRecord({
      totalBoutsSnapshot: a.totalBoutsSnapshot ?? null,
      winsSnapshot: a.winsSnapshot ?? null,
      drawsSnapshot: a.drawsSnapshot ?? null,
      lossesSnapshot: a.lossesSnapshot ?? null,
      recordText: a.recordText ?? null,
      fighter: {
        recordTotalBouts: a.fighter.recordTotalBouts ?? 0,
        recordWin: a.fighter.recordWin,
        recordLoss: a.fighter.recordLoss,
        recordDraw: a.fighter.recordDraw,
      },
    }),
    totalBoutsSnapshot: a.totalBoutsSnapshot ?? null,
    recordText: a.recordText ?? null,
    applicationWeightKg: readApplicationWeightKg(
      a.fighterSnapshot,
      a.weighInWeightKg,
    ),
    schoolLevel: a.schoolLevelSnapshot ?? null,
    schoolGrade: a.schoolGradeSnapshot ?? null,
  };
}

function toBracketSnapshotSource(
  row: ApprovedApplicationForBracketRow,
): BracketFighterSnapshotSource {
  return {
    fighter: row.fighter,
    gym: row.gym,
    gymSnapshot: row.gymSnapshot,
    gymNameSnapshot: row.gymNameSnapshot,
    division: row.division ?? {
      sportType: null,
      ruleType: null,
      gender: null,
      ageGroup: null,
      weightClass: null,
      weightClassName: null,
      weightLimitText: null,
      skillLevel: null,
    },
  };
}

async function appendChangeLog(
  tx: Prisma.TransactionClient,
  params: {
    eventId: string;
    bracketId: string;
    matchId?: string | null;
    changedByUserId?: string | null;
    changedByStaffLinkId?: string | null;
    bracketType: BracketType;
    changeType: BracketChangeType;
    beforeData?: Prisma.InputJsonValue | null;
    afterData?: Prisma.InputJsonValue | null;
    reason?: string | null;
  },
): Promise<void> {
  await bracketRepository.createBracketChangeLog(
    {
      eventId: params.eventId,
      bracketId: params.bracketId,
      matchId: params.matchId ?? null,
      changedByUserId: params.changedByUserId ?? null,
      changedByStaffLinkId: params.changedByStaffLinkId ?? null,
      bracketType: params.bracketType,
      changeType: params.changeType,
      beforeData: params.beforeData ?? null,
      afterData: params.afterData ?? null,
      reason: reasonFor(params.changeType, params.reason ?? undefined),
    },
    tx,
  );
}

async function ensureBracketOrganizer(
  actor: ActorContext,
  bracketId: string,
): Promise<BracketOwnershipContext> {
  requireRole(actor, ["organizer", "admin"]);
  const ctx = await bracketRepository.findBracketOwnershipContext(bracketId);
  if (!ctx) {
    throw new AppError("NOT_FOUND", "대진표를 찾을 수 없습니다.");
  }
  await requireOrganizerForEvent(actor, ctx.eventId);
  return ctx;
}

function singleElimRoundLabel(depth: number, r: number): string {
  if (r === depth) return "결승";
  const stage = 2 ** (depth - r + 1);
  return `${stage}강`;
}

type PreservedCourtAssignment = {
  courtId: string | null;
  courtOrder: number | null;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  matchOrder: number;
};

async function resolveSuggestedCourtId(
  eventId: string,
  divisionId: string | null,
  explicitCourtId: string | null,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  if (explicitCourtId) {
    const court = await (tx ?? prisma).eventCourt.findUnique({
      where: { id: explicitCourtId },
      select: { id: true, eventId: true, isActive: true },
    });
    if (!court || court.eventId !== eventId || !court.isActive) {
      throw new AppError(
        "VALIDATION_ERROR",
        "활성 경기장을 선택해 주세요.",
      );
    }
    return explicitCourtId;
  }
  if (!divisionId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "경기장을 선택해 주세요.",
    );
  }
  const division = await (tx ?? prisma).eventDivision.findUnique({
    where: { id: divisionId },
    select: { id: true, weightClass: true },
  });
  if (!division) {
    throw new AppError("VALIDATION_ERROR", "경기장을 선택해 주세요.");
  }
  const suggested = await eventCourtService.suggestCourtForDivision(eventId, {
    id: division.id,
    weightClass: division.weightClass,
  });
  if (!suggested) {
    throw new AppError(
      "VALIDATION_ERROR",
      "활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.",
    );
  }
  return suggested;
}

async function nextCourtOrderForCourt(
  eventId: string,
  courtId: string,
  pendingOrders: Map<string, number>,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const cached = pendingOrders.get(courtId);
  if (cached != null) {
    pendingOrders.set(courtId, cached + 1);
    return cached;
  }
  const row = await (tx ?? prisma).bracketMatch.aggregate({
    where: {
      courtId,
      bracket: { eventId },
    },
    _max: { courtOrder: true },
  });
  const next = (row._max.courtOrder ?? 0) + 1;
  pendingOrders.set(courtId, next + 1);
  return next;
}

async function nextEventWideMatchNumber(
  eventId: string,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const row = await (tx ?? prisma).bracketMatch.aggregate({
    where: { bracket: { eventId } },
    _max: { matchNumber: true },
  });
  return (row._max.matchNumber ?? 0) + 1;
}

/** 대회 전체 표시 순번(matchNumber)을 1…N으로 맞춘다. courtOrder는 건드리지 않는다. */
async function applyEventWideMatchNumberResequence(
  eventId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const [courts, peers] = await Promise.all([
    eventCourtRepository.listByEvent(eventId, tx),
    tx.bracketMatch.findMany({
      where: { bracket: { eventId } },
      select: {
        id: true,
        courtId: true,
        courtOrder: true,
        matchNumber: true,
      },
    }),
  ]);
  if (!eventWideMatchNumbersNeedResequence(peers)) return;

  const updates = renumberEventWideMatchNumbers(
    peers.map((m) => ({
      matchId: m.id,
      courtId: m.courtId,
      courtOrder: m.courtOrder,
      matchNumber: m.matchNumber,
    })),
    courts.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
  );
  for (const u of updates) {
    const prev = peers.find((p) => p.id === u.matchId);
    if (prev?.matchNumber === u.matchNumber) continue;
    await bracketRepository.updateBracketMatch(
      u.matchId,
      { matchNumber: u.matchNumber },
      tx,
    );
  }
}

function findPreservedCourtAssignment(
  previous: PreservedCourtAssignment[],
  input: {
    fighterRedId?: string | null;
    fighterBlueId?: string | null;
    matchOrder: number;
  },
): { courtId: string | null; courtOrder: number | null } | null {
  const red = input.fighterRedId ?? null;
  const blue = input.fighterBlueId ?? null;

  const byFighters = previous.find(
    (m) =>
      m.courtId &&
      ((m.fighterRedId === red && m.fighterBlueId === blue) ||
        (m.fighterRedId === blue && m.fighterBlueId === red)),
  );
  if (byFighters) {
    return { courtId: byFighters.courtId, courtOrder: byFighters.courtOrder };
  }

  const byOrder = previous.find(
    (m) => m.courtId && m.matchOrder === input.matchOrder,
  );
  if (byOrder) {
    return { courtId: byOrder.courtId, courtOrder: byOrder.courtOrder };
  }

  return null;
}

async function createSingleEliminationTree(
  tx: Prisma.TransactionClient,
  bracketId: string,
  slotCount: number,
  eventId: string,
  divisionId: string | null,
  courtId: string,
): Promise<void> {
  const depth = Math.round(Math.log2(slotCount));
  if (2 ** depth !== slotCount) {
    throw new AppError(
      "VALIDATION_ERROR",
      "단판 토너먼트 슬롯 수는 4·8·16만 지원합니다.",
    );
  }

  let upperRoundMatches: { id: string }[] = [];
  const pendingCourtOrders = new Map<string, number>();

  for (let r = depth; r >= 1; r--) {
    const count = 2 ** (depth - r);
    const currentRound: { id: string }[] = [];
    for (let i = 0; i < count; i++) {
      const parent =
        r === depth ? null : upperRoundMatches[Math.floor(i / 2)]!;
      const nextMatchId = parent?.id ?? null;
      const nextMatchSlot =
        r === depth
          ? null
          : i % 2 === 0
            ? NextMatchSlot.red
            : NextMatchSlot.blue;

      const courtOrder = await nextCourtOrderForCourt(
        eventId,
        courtId,
        pendingCourtOrders,
        tx,
      );

      const { id } = await bracketRepository.createBracketMatch(
        {
          bracketId,
          round: r,
          roundName: singleElimRoundLabel(depth, r),
          matchOrder: i,
          globalMatchOrder: null,
          matchNumber: null,
          matNumber: null,
          courtId,
          courtOrder,
          nextMatchId,
          nextMatchSlot,
        },
        tx,
      );
      currentRound.push({ id });
    }
    upperRoundMatches = currentRound;
  }
}

function snapshotToPublic(
  raw: unknown,
  handicapMap?: Map<string, FighterHandicapMapEntry>,
): PublicBracketFighterDTO | null {
  const p = parseBracketFighterSnapshot(raw);
  if (!p) return null;
  const handicap = handicapMap?.get(p.fighterId);
  return {
    fighterId: p.fighterId,
    fighterCode: p.fighterCode,
    name: p.name,
    gymName: p.gymName,
    profileImageUrl: null,
    recordSummary: p.recordSummary,
    divisionName: p.divisionName,
    handicapBadgeLabel: handicap?.badgeLabel ?? null,
    handicapNote: handicap?.note ?? null,
  };
}

export type OrganizerBracketListUnmatchedPreviewVM = {
  fighterName: string;
  gymName: string;
};

export type OrganizerBracketListItemVM = {
  /** React key — bracketId 또는 `pending:${divisionId}` */
  id: string;
  bracketId: string | null;
  title: string;
  displayTitle: string;
  type: BracketType;
  status: BracketStatus;
  isPublic: boolean;
  divisionId: string;
  division: EventDivisionDisplayInput | null;
  divisionLabel: string | null;
  applicantCount: number;
  matchCount: number;
  unmatchedCount: number;
  /** 미매칭 미리보기 (최대 5명) */
  unmatchedPreview: OrganizerBracketListUnmatchedPreviewVM[];
  /** Dialog용 전체 미매칭 목록 */
  unmatchedFighters: OrganizerBracketListUnmatchedPreviewVM[];
};

export type OrganizerBracketMatchVM = {
  id: string;
  round: number | null;
  roundName: string | null;
  matchOrder: number;
  globalMatchOrder: number | null;
  matchNumber: number | null;
  matNumber: number | null;
  courtId: string | null;
  courtOrder: number | null;
  courtName: string | null;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedSnapshot: BracketFighterSnapshotPayload | null;
  fighterBlueSnapshot: BracketFighterSnapshotPayload | null;
  nextMatchId: string | null;
  nextMatchSlot: NextMatchSlot | null;
  status: BracketMatchStatus;
  winnerId: string | null;
  loserId: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  resultMemo: string | null;
  organizerMemo: string | null;
  /** 경기 공식 체중(kg). null이면 미입력 */
  matchWeightKg: number | null;
  /** 확정·정정된 MatchResult가 양쪽 모두 있을 때 공식 전적 반영으로 간주 */
  hasOfficialResults: boolean;
};

export type OrganizerApprovedFighterOptionVM = {
  applicationId: string;
  fighterId: string;
  label: string;
  divisionId: string | null;
  divisionLabel: string;
  /** 신청 시점 표시 — snapshot/OTHER 텍스트 기반 */
  appliedDivisionLabel: string;
  /** EventApplication.divisionId 현재 배정 */
  currentDivisionLabel: string;
  /** 현재 bracket EventDivision과 다른 배정 */
  isOtherDivision: boolean;
  /** 표시용 division 필드 — 공통 칩 helper 입력. */
  division: EventDivisionDisplayInput;
  fighterName: string;
  gymName: string;
  fighterGender: string | null;
  /** 출전 확정 여부 (현장·계체 완료) */
  isEligibleForBracket: boolean;
  eligibilityLabel: string;
  eligibilityReason: string;
  /** 대진 배치 가능 여부 */
  isAssignableForBracket: boolean;
  assignabilityLabel: string;
  assignabilityDisabledReason?: string;
  assignabilityWarningReason?: string;
  /** 후보 카드 보조 표시 */
  recordSummary: string;
  /** 신청 snapshot — 전적 필터 SSOT */
  totalBoutsSnapshot?: number | null;
  recordText?: string | null;
  applicationWeightKg: number | null;
  /** EventApplication snapshot — 표시용. schema 추가 없음 */
  schoolLevel: string | null;
  schoolGrade: number | null;
};

export type OrganizerBracketDetailVM = {
  id: string;
  eventId: string;
  title: string;
  displayTitle: string;
  type: BracketType;
  status: BracketStatus;
  isPublic: boolean;
  divisionId: string | null;
  division: EventDivisionDisplayInput | null;
  divisionLabel: string | null;
  matches: OrganizerBracketMatchVM[];
  approvedFighterOptions: OrganizerApprovedFighterOptionVM[];
  /** 대회 전체 — Match 미배정 + 배치 가능 선수 */
  eventWideUnmatchedOptions: OrganizerApprovedFighterOptionVM[];
  /** 서버 매치 스냅샷이 바뀌면 값이 달라지며, 클라이언트 폼 상태 리마운트에 사용한다. */
  syncKey: string;
};

/** 전체 경기 편집 — match 행에 bracket/division 컨텍스트 포함 */
export type OrganizerEventAllMatchVM = OrganizerBracketMatchVM & {
  bracketId: string;
  divisionId: string | null;
  divisionLabel: string | null;
  bracketType: BracketType;
  bracketIsPublic: boolean;
};

export type OrganizerEventAllMatchesDivisionOptionVM = {
  id: string;
  label: string;
  bracketId: string | null;
  gender: string | null;
};

export type OrganizerEventAllMatchesWorkspaceVM = {
  eventId: string;
  eventTitle: string;
  matches: OrganizerEventAllMatchVM[];
  approvedFighterOptions: OrganizerApprovedFighterOptionVM[];
  eventWideUnmatchedOptions: OrganizerApprovedFighterOptionVM[];
  divisions: OrganizerEventAllMatchesDivisionOptionVM[];
  syncKey: string;
};

export const bracketService = {
  async listOrganizerEventBrackets(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerBracketListItemVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const [divisions, brackets, applications, placedByDivision] =
      await Promise.all([
        eventRepository.findPublicEventDivisions(eventId),
        bracketRepository.listBracketsByEvent(eventId),
        bracketRepository.listApprovedRegisteredApplicationsForDivisionAggregation(
          eventId,
        ),
        bracketRepository.listPlacedFighterIdsByDivision(eventId),
      ]);

    const bracketsByDivision = new Map<
      string,
      (typeof brackets)[number][]
    >();
    for (const b of brackets) {
      if (!b.divisionId) continue;
      const list = bracketsByDivision.get(b.divisionId) ?? [];
      list.push(b);
      bracketsByDivision.set(b.divisionId, list);
    }

    type AppRow = (typeof applications)[number];
    const appsByDivision = new Map<string, AppRow[]>();
    for (const app of applications) {
      if (!app.divisionId) continue;
      const list = appsByDivision.get(app.divisionId) ?? [];
      list.push(app);
      appsByDivision.set(app.divisionId, list);
    }

    const result: OrganizerBracketListItemVM[] = [];

    for (const div of divisions) {
      const divisionApps = appsByDivision.get(div.id) ?? [];
      const divisionBrackets = bracketsByDivision.get(div.id) ?? [];
      if (divisionApps.length === 0 && divisionBrackets.length === 0) {
        continue;
      }

      const division = toEventDivisionDisplayInput(div);
      const placed = placedByDivision.get(div.id) ?? new Set<string>();

      const unmatchedFighters: OrganizerBracketListUnmatchedPreviewVM[] = [];
      for (const app of divisionApps) {
        const assignability = computeBracketAssignability({
          checkInStatus: app.checkInStatus,
          weighInStatus: app.weighInStatus,
          weighInFailureResolution: app.weighInFailureResolution,
          applicationStatus: app.status,
          cancellationSource: app.cancellationSource,
          weighInWeightKg: app.weighInWeightKg,
        });
        if (!assignability.isAssignable) continue;
        if (placed.has(app.fighterId)) continue;
        unmatchedFighters.push({
          fighterName: app.fighter.name,
          gymName: resolveApplicationGymDisplayName({
            gymNameSnapshot: app.gymNameSnapshot,
            gymSnapshot: app.gymSnapshot,
            gymRelationName: app.gym?.name,
          }),
        });
      }

      const preferred =
        divisionBrackets.find((b) => b.type === BracketType.match_list) ??
        divisionBrackets[0] ??
        null;

      const matchCount = divisionBrackets.reduce(
        (sum, b) => sum + b._count.matches,
        0,
      );

      const title =
        preferred?.title ??
        (division ? formatAutoBracketGroupTitle(division) : "대진표");
      const displayTitle = formatBracketTitleForDisplay(title, division);

      result.push({
        id: preferred?.id ?? `pending:${div.id}`,
        bracketId: preferred?.id ?? null,
        title,
        displayTitle,
        type: preferred?.type ?? BracketType.match_list,
        status: preferred?.status ?? BracketStatus.draft,
        isPublic: preferred?.isPublic ?? false,
        divisionId: div.id,
        division,
        divisionLabel: division ? formatDivisionNameLabel(division) : null,
        applicantCount: divisionApps.length,
        matchCount,
        unmatchedCount: unmatchedFighters.length,
        unmatchedPreview: unmatchedFighters.slice(0, 5),
        unmatchedFighters,
      });
    }

    return result;
  },

  /**
   * 체급용 match_list draft 브래킷이 없으면 생성. 목록 조회에서는 호출하지 않는다.
   */
  async ensureBracketShellForDivision(
    actor: ActorContext,
    input: EnsureBracketForDivisionInput,
  ): Promise<{ bracketId: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const ok = await eventRepository.findDivisionBelongsToEvent(
      input.divisionId,
      input.eventId,
    );
    if (!ok) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선택한 경기구분이 이 대회에 속하지 않습니다.",
      );
    }

    const existing = await bracketRepository.findMatchListBracketByDivision(
      input.eventId,
      input.divisionId,
    );
    if (existing) {
      return { bracketId: existing.id };
    }

    const divisionRow = await eventRepository.findEventDivisionById(
      input.divisionId,
    );
    if (!divisionRow) {
      throw new AppError("NOT_FOUND", "경기구분을 찾을 수 없습니다.");
    }

    const divisionInput = toEventDivisionDisplayInput(divisionRow)!;
    const title = formatAutoBracketGroupTitle(divisionInput);

    const bracketId = await prisma.$transaction(async (tx) => {
      const again = await bracketRepository.findMatchListBracketByDivision(
        input.eventId,
        input.divisionId,
        tx,
      );
      if (again) return again.id;

      const peers = await bracketRepository.listBracketsByEvent(
        input.eventId,
        tx,
      );
      const eventPublic = peers.some((p) => p.isPublic);

      const { id } = await bracketRepository.createBracket(
        {
          eventId: input.eventId,
          divisionId: input.divisionId,
          title,
          type: BracketType.match_list,
          status: eventPublic ? BracketStatus.published : BracketStatus.draft,
          isPublic: eventPublic,
        },
        tx,
      );

      await appendChangeLog(tx, {
        eventId: input.eventId,
        bracketId: id,
        changedByUserId: actor.userId,
        bracketType: BracketType.match_list,
        changeType: BracketChangeType.bracket_created,
        afterData: {
          title,
          divisionId: input.divisionId,
          type: BracketType.match_list,
          ensuredShell: true,
        },
      });

      return id;
    });

    return { bracketId };
  },

  /** gap/null matchNumber를 1…N으로 복구 (courtOrder·Match.id 불변) */
  async ensureEventWideMatchDisplayNumbers(
    actor: ActorContext,
    eventId: string,
  ): Promise<void> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const peers = await prisma.bracketMatch.findMany({
      where: { bracket: { eventId } },
      select: { matchNumber: true },
    });
    if (!eventWideMatchNumbersNeedResequence(peers)) return;
    await prisma.$transaction(
      async (tx) => {
        await applyEventWideMatchNumberResequence(eventId, tx);
      },
      { timeout: 30_000 },
    );
  },

  /**
   * Match의 경기구분(Bracket.divisionId) 변경.
   * EventApplication.divisionId는 변경하지 않는다.
   * matchNumber / courtId / courtOrder 유지. Match.id 유지.
   */
  async changeMatchDivision(
    actor: ActorContext,
    input: {
      eventId: string;
      matchId: string;
      targetDivisionId: string;
      clearIncompatibleFighters?: boolean;
    },
  ): Promise<{ bracketId: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const ok = await eventRepository.findDivisionBelongsToEvent(
      input.targetDivisionId,
      input.eventId,
    );
    if (!ok) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선택한 경기구분이 이 대회에 속하지 않습니다.",
      );
    }

    const { bracketId: targetBracketId } =
      await this.ensureBracketShellForDivision(actor, {
        eventId: input.eventId,
        divisionId: input.targetDivisionId,
      });

    return prisma.$transaction(async (tx) => {
      const match = await bracketRepository.findBracketMatchById(
        input.matchId,
        tx,
      );
      if (!match || match.bracket.eventId !== input.eventId) {
        throw new AppError("NOT_FOUND", "매치를 찾을 수 없습니다.");
      }
      if (match.bracket.type !== BracketType.match_list) {
        throw new AppError(
          "VALIDATION_ERROR",
          "경기 목록 대진표에서만 경기구분을 변경할 수 있습니다.",
        );
      }

      const officialCount = await tx.matchResult.count({
        where: {
          matchId: input.matchId,
          status: {
            in: [
              MatchRecordStatus.confirmed,
              MatchRecordStatus.corrected,
            ],
          },
        },
      });
      if (officialCount >= 2) {
        throw new AppError(
          "CONFLICT",
          "완료된 경기는 경기구분을 변경할 수 없습니다.",
        );
      }

      if (match.bracketId === targetBracketId) {
        return { bracketId: targetBracketId };
      }

      const incompatibleSlots: Array<"red" | "blue"> = [];
      for (const slot of ["red", "blue"] as const) {
        const fighterId =
          slot === "red" ? match.fighterRedId : match.fighterBlueId;
        if (!fighterId) continue;
        const app =
          await bracketRepository.findApprovedApplicationForEventPlacement(
            input.eventId,
            fighterId,
            tx,
          );
        if (!app || app.divisionId !== input.targetDivisionId) {
          incompatibleSlots.push(slot);
        }
      }

      if (
        incompatibleSlots.length > 0 &&
        !input.clearIncompatibleFighters
      ) {
        throw new AppError(
          "CONFLICT",
          "경기구분을 변경하면 현재 배정된 선수 중 새 경기구분과 맞지 않는 선수가 있습니다. 배정을 해제하고 변경하시겠습니까?",
          { code: "DIVISION_INCOMPATIBLE_FIGHTERS", incompatibleSlots },
        );
      }

      const clearPatch: Prisma.BracketMatchUncheckedUpdateInput = {};
      for (const slot of incompatibleSlots) {
        if (slot === "red") {
          clearPatch.fighterRedId = null;
          clearPatch.fighterRedSnapshot = Prisma.JsonNull;
        } else {
          clearPatch.fighterBlueId = null;
          clearPatch.fighterBlueSnapshot = Prisma.JsonNull;
        }
      }
      if (Object.keys(clearPatch).length > 0) {
        await bracketRepository.updateBracketMatch(
          input.matchId,
          clearPatch,
          tx,
        );
        for (const slot of incompatibleSlots) {
          await appendChangeLog(tx, {
            eventId: input.eventId,
            bracketId: match.bracketId,
            matchId: input.matchId,
            changedByUserId: actor.userId,
            bracketType: match.bracket.type,
            changeType: BracketChangeType.fighter_removed,
            beforeData: {
              slot,
              fighterId:
                slot === "red" ? match.fighterRedId : match.fighterBlueId,
            },
            afterData: { slot, fighterId: null },
            reason: "경기구분 변경 — 비호환 선수 해제",
          });
        }
      }

      const nextOrder =
        (await bracketRepository.getMaxMatchOrderForBracket(
          targetBracketId,
          tx,
        )) + 1;

      await bracketRepository.updateBracketMatch(
        input.matchId,
        {
          bracketId: targetBracketId,
          matchOrder: nextOrder,
        },
        tx,
      );

      await appendChangeLog(tx, {
        eventId: input.eventId,
        bracketId: targetBracketId,
        matchId: input.matchId,
        changedByUserId: actor.userId,
        bracketType: BracketType.match_list,
        changeType: BracketChangeType.match_order_changed,
        beforeData: {
          bracketId: match.bracketId,
          divisionId: match.bracket.divisionId,
          matchOrder: match.matchOrder,
          matchNumber: match.matchNumber,
          courtId: match.courtId,
          courtOrder: match.courtOrder,
        },
        afterData: {
          bracketId: targetBracketId,
          divisionId: input.targetDivisionId,
          matchOrder: nextOrder,
          matchNumber: match.matchNumber,
          courtId: match.courtId,
          courtOrder: match.courtOrder,
          clearedSlots: incompatibleSlots,
        },
        reason: "경기구분 변경",
      });

      return { bracketId: targetBracketId };
    });
  },

  async getOrganizerBracketDetail(
    actor: ActorContext,
    bracketId: string,
  ): Promise<OrganizerBracketDetailVM> {
    await ensureBracketOrganizer(actor, bracketId);
    const full = await bracketRepository.findBracketWithMatches(bracketId);
    if (!full) {
      throw new AppError("NOT_FOUND", "대진표를 찾을 수 없습니다.");
    }

    const approved =
      await bracketRepository.listApprovedApplicationsForBracket(
        full.eventId,
        full.divisionId,
      );

    const fieldStatusMap =
      await fieldStatusService.listBracketCandidateFieldStatus(
        full.eventId,
        full.divisionId,
      );

    const approvedFighterOptions: OrganizerApprovedFighterOptionVM[] =
      approved.map((a) =>
        mapApplicationToApprovedOption(
          a,
          fieldStatusMap.get(a.fighter.id),
          full.divisionId,
        ),
      );

    const [placedFighterIds, allEventApproved, eventFieldStatusMap] =
      await Promise.all([
        bracketRepository.listPlacedFighterIdsForEvent(full.eventId),
        bracketRepository.listApprovedApplicationsForBracket(
          full.eventId,
          null,
        ),
        fieldStatusService.listBracketCandidateFieldStatus(full.eventId, null),
      ]);
    const placedSet = new Set(placedFighterIds);
    const eventWideUnmatchedOptions = allEventApproved
      .map((a) =>
        mapApplicationToApprovedOption(
          a,
          eventFieldStatusMap.get(a.fighter.id),
          full.divisionId,
        ),
      )
      .filter((o) => o.isAssignableForBracket && !placedSet.has(o.fighterId))
      .sort((a, b) => {
        if (a.isOtherDivision !== b.isOtherDivision) {
          return a.isOtherDivision ? 1 : -1;
        }
        const wA = a.applicationWeightKg ?? Number.POSITIVE_INFINITY;
        const wB = b.applicationWeightKg ?? Number.POSITIVE_INFINITY;
        if (wA !== wB) return wA - wB;
        return a.fighterName.localeCompare(b.fighterName, "ko");
      });

    const matches: OrganizerBracketMatchVM[] = full.matches.map((m) => ({
      id: m.id,
      round: m.round,
      roundName: m.roundName,
      matchOrder: m.matchOrder,
      globalMatchOrder: m.globalMatchOrder,
      matchNumber: m.matchNumber,
      matNumber: m.matNumber,
      courtId: m.courtId ?? null,
      courtOrder: m.courtOrder ?? null,
      courtName: m.court?.name ?? null,
      fighterRedId: m.fighterRedId,
      fighterBlueId: m.fighterBlueId,
      fighterRedSnapshot: parseBracketFighterSnapshot(m.fighterRedSnapshot),
      fighterBlueSnapshot: parseBracketFighterSnapshot(m.fighterBlueSnapshot),
      nextMatchId: m.nextMatchId,
      nextMatchSlot: m.nextMatchSlot,
      status: m.status,
      winnerId: m.winnerId,
      loserId: m.loserId,
      resultType: m.resultType,
      resultMemo: m.resultMemo,
      organizerMemo: m.organizerMemo ?? null,
      matchWeightKg: m.matchWeightKg ?? null,
      hasOfficialResults: (m.matchResults?.length ?? 0) >= 2,
    }));

    const syncKey = matches
      .map(
        (m) =>
          `${m.id}:${m.fighterRedId ?? ""}:${m.fighterBlueId ?? ""}:${m.matchOrder}:${m.globalMatchOrder ?? ""}:${m.matNumber ?? ""}:${m.matchNumber ?? ""}:${m.courtId ?? ""}:${m.courtOrder ?? ""}:${m.status}:${m.winnerId ?? ""}:${m.resultType ?? ""}:${m.hasOfficialResults ? "1" : "0"}:${m.matchWeightKg ?? ""}`,
      )
      .join("|");

    const division = toEventDivisionDisplayInput(full.division);

    return {
      id: full.id,
      eventId: full.eventId,
      title: full.title,
      displayTitle: formatBracketTitleForDisplay(full.title, division),
      type: full.type,
      status: full.status,
      isPublic: full.isPublic,
      divisionId: full.divisionId,
      division,
      divisionLabel: division ? formatDivisionNameLabel(division) : null,
      matches,
      approvedFighterOptions,
      eventWideUnmatchedOptions,
      syncKey,
    };
  },

  async getOrganizerEventAllMatchesWorkspace(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerEventAllMatchesWorkspaceVM> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const [event, initialMatchRows, placedFighterIds, allEventApproved, eventFieldStatusMap, divisions, brackets] =
      await Promise.all([
        prisma.event.findUnique({
          where: { id: eventId },
          select: { id: true, title: true },
        }),
        matchRepository.listMatchesByEvent(eventId),
        bracketRepository.listPlacedFighterIdsForEvent(eventId),
        bracketRepository.listApprovedApplicationsForBracket(eventId, null),
        fieldStatusService.listBracketCandidateFieldStatus(eventId, null),
        eventRepository.findPublicEventDivisions(eventId),
        bracketRepository.listBracketsByEvent(eventId),
      ]);

    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }

    const courts = await eventCourtRepository.listByEvent(eventId);

    let matchRows = initialMatchRows;
    if (
      eventWideMatchNumbersNeedResequence(
        matchRows.map((m) => ({ matchNumber: m.matchNumber })),
      )
    ) {
      await prisma.$transaction(
        async (tx) => {
          await applyEventWideMatchNumberResequence(eventId, tx);
        },
        { timeout: 30_000 },
      );
      matchRows = await matchRepository.listMatchesByEvent(eventId);
    }

    const approvedFighterOptions: OrganizerApprovedFighterOptionVM[] =
      allEventApproved.map((a) =>
        mapApplicationToApprovedOption(
          a,
          eventFieldStatusMap.get(a.fighter.id),
          a.divisionId,
        ),
      );

    const placedSet = new Set(placedFighterIds);
    const eventWideUnmatchedOptions = approvedFighterOptions
      .filter((o) => o.isAssignableForBracket && !placedSet.has(o.fighterId))
      .sort((a, b) => {
        if (a.isOtherDivision !== b.isOtherDivision) {
          return a.isOtherDivision ? 1 : -1;
        }
        const wA = a.applicationWeightKg ?? Number.POSITIVE_INFINITY;
        const wB = b.applicationWeightKg ?? Number.POSITIVE_INFINITY;
        if (wA !== wB) return wA - wB;
        return a.fighterName.localeCompare(b.fighterName, "ko");
      });

    const mapped: OrganizerEventAllMatchVM[] = matchRows.map((m) => {
      const division = toEventDivisionDisplayInput(m.bracket.division);
      return {
        id: m.id,
        bracketId: m.bracketId,
        divisionId: m.bracket.divisionId ?? null,
        divisionLabel: division
          ? formatDivisionMainLabel(division)
          : null,
        bracketType: m.bracket.type,
        bracketIsPublic: m.bracket.isPublic,
        round: m.round,
        roundName: m.roundName,
        matchOrder: m.matchOrder,
        globalMatchOrder: m.globalMatchOrder,
        matchNumber: m.matchNumber,
        matNumber: m.matNumber,
        courtId: m.courtId ?? null,
        courtOrder: m.courtOrder ?? null,
        courtName: m.court?.name ?? null,
        fighterRedId: m.fighterRedId,
        fighterBlueId: m.fighterBlueId,
        fighterRedSnapshot: parseBracketFighterSnapshot(m.fighterRedSnapshot),
        fighterBlueSnapshot: parseBracketFighterSnapshot(m.fighterBlueSnapshot),
        nextMatchId: m.nextMatchId,
        nextMatchSlot: m.nextMatchSlot,
        status: m.status,
        winnerId: m.winnerId,
        loserId: m.loserId,
        resultType: m.resultType,
        resultMemo: m.resultMemo,
        organizerMemo: m.organizerMemo ?? null,
        matchWeightKg: m.matchWeightKg ?? null,
        hasOfficialResults: (m.matchResults?.length ?? 0) >= 2,
      };
    });

    const matches = sortMatchesByCourtSchedule(
      mapped.map((m) => ({ ...m, matchId: m.id })),
      courts.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
    );

    const bracketsByDivision = new Map<string, string>();
    for (const b of brackets) {
      if (!b.divisionId) continue;
      if (b.type !== BracketType.match_list) continue;
      if (!bracketsByDivision.has(b.divisionId)) {
        bracketsByDivision.set(b.divisionId, b.id);
      }
    }

    const divisionOptions: OrganizerEventAllMatchesDivisionOptionVM[] =
      divisions.map((d) => {
        const input = toEventDivisionDisplayInput(d);
        return {
          id: d.id,
          label: input ? formatDivisionMainLabel(input) : d.id,
          bracketId: bracketsByDivision.get(d.id) ?? null,
          gender: input?.gender ?? null,
        };
      });

    const syncKey = matches
      .map(
        (m) =>
          `${m.id}:${m.bracketId}:${m.fighterRedId ?? ""}:${m.fighterBlueId ?? ""}:${m.matchOrder}:${m.globalMatchOrder ?? ""}:${m.matNumber ?? ""}:${m.matchNumber ?? ""}:${m.courtId ?? ""}:${m.courtOrder ?? ""}:${m.status}:${m.organizerMemo ?? ""}:${m.matchWeightKg ?? ""}:${m.hasOfficialResults ? "1" : "0"}`,
      )
      .join("|");

    return {
      eventId,
      eventTitle: event.title,
      matches,
      approvedFighterOptions,
      eventWideUnmatchedOptions,
      divisions: divisionOptions,
      syncKey,
    };
  },

  async createBracketForEvent(
    actor: ActorContext,
    input: CreateBracketInput,
  ): Promise<{ bracketId: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    if (!input.divisionId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "경기구분을 선택해 주세요.",
      );
    }

    const ok = await eventRepository.findDivisionBelongsToEvent(
      input.divisionId,
      input.eventId,
    );
    if (!ok) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선택한 경기구분이 이 대회에 속하지 않습니다.",
      );
    }

    const divisionRow = await eventRepository.findEventDivisionById(
      input.divisionId,
    );
    if (!divisionRow) {
      throw new AppError("NOT_FOUND", "경기구분을 찾을 수 없습니다.");
    }

    const divisionInput = toEventDivisionDisplayInput(divisionRow)!;
    const title = formatAutoBracketGroupTitle(divisionInput);

    const bracketId = await prisma.$transaction(async (tx) => {
      const peers = await bracketRepository.listBracketsByEvent(
        input.eventId,
        tx,
      );
      const eventPublic = peers.some((p) => p.isPublic);

      const { id } = await bracketRepository.createBracket(
        {
          eventId: input.eventId,
          divisionId: input.divisionId,
          title,
          type: input.type,
          status: eventPublic ? BracketStatus.published : BracketStatus.draft,
          isPublic: eventPublic,
        },
        tx,
      );

      await appendChangeLog(tx, {
        eventId: input.eventId,
        bracketId: id,
        changedByUserId: actor.userId,
        bracketType: input.type,
        changeType: BracketChangeType.bracket_created,
        afterData: {
          title,
          divisionId: input.divisionId,
          type: input.type,
        },
      });

      return id;
    });

    return { bracketId };
  },

  async publishBracket(actor: ActorContext, bracketId: string): Promise<void> {
    const ctx = await ensureBracketOrganizer(actor, bracketId);
    const row = await bracketRepository.findBracketById(bracketId);
    if (!row) {
      throw new AppError("NOT_FOUND", "대진표를 찾을 수 없습니다.");
    }

    if (row.status === BracketStatus.published && row.isPublic) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      await bracketRepository.updateBracket(
        bracketId,
        {
          status: BracketStatus.published,
          isPublic: true,
        },
        tx,
      );

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.bracket_published,
        beforeData: {
          status: row.status,
          isPublic: row.isPublic,
        },
        afterData: {
          status: BracketStatus.published,
          isPublic: true,
        },
      });
    });

    const [ev, fighterIds] = await Promise.all([
      notificationRepository.getEventSlugTitle(ctx.eventId),
      notificationRepository.listCornerFighterIdsForBracket(bracketId),
    ]);
    if (ev?.publicSlug && fighterIds.length > 0) {
      safeNotify(`bracket-published:${bracketId}`, () =>
        notificationService.notifyBracketPublished({
          eventId: ctx.eventId,
          eventTitle: ev.title,
          publicSlug: ev.publicSlug,
          bracketTitle: row.title,
          fighterIds,
        }),
      );
    }
  },

  async publishAllEventBrackets(
    actor: ActorContext,
    eventId: string,
  ): Promise<{ published: number }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const brackets = await bracketRepository.listBracketsByEvent(eventId);
    let published = 0;
    for (const b of brackets) {
      const alreadyPublic =
        b.isPublic &&
        (b.status === BracketStatus.published ||
          b.status === BracketStatus.ongoing ||
          b.status === BracketStatus.finished);
      if (!alreadyPublic) {
        await bracketService.publishBracket(actor, b.id);
        published += 1;
      }
    }
    return { published };
  },

  async unpublishAllEventBrackets(
    actor: ActorContext,
    eventId: string,
  ): Promise<{ unpublished: number }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const brackets = await bracketRepository.listBracketsByEvent(eventId);
    let unpublished = 0;
    for (const b of brackets) {
      if (b.isPublic) {
        await bracketService.unpublishBracket(actor, b.id);
        unpublished += 1;
      }
    }
    return { unpublished };
  },

  async unpublishBracket(actor: ActorContext, bracketId: string): Promise<void> {
    const ctx = await ensureBracketOrganizer(actor, bracketId);
    const row = await bracketRepository.findBracketById(bracketId);
    if (!row) {
      throw new AppError("NOT_FOUND", "대진표를 찾을 수 없습니다.");
    }

    await prisma.$transaction(async (tx) => {
      await bracketRepository.updateBracket(
        bracketId,
        { isPublic: false },
        tx,
      );

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.bracket_unpublished,
        beforeData: { isPublic: row.isPublic },
        afterData: { isPublic: false },
      });

      const ev = await notificationRepository.getEventSlugTitle(ctx.eventId, tx);
      const br = await bracketRepository.findBracketById(bracketId, tx);
      if (ev?.publicSlug && br) {
        await tryNotify("bracket-changed", () =>
          notificationService.notifyBracketChanged(
          {
            eventId: ctx.eventId,
            publicSlug: ev.publicSlug,
            bracketId,
            bracketTitle: br.title,
            summaryLine: "대진표 공개가 해제되었습니다.",
            scope: "bracket_all",
          },
          tx,
          ),
        );
      }
    });
  },

  async createMatchListMatches(
    actor: ActorContext,
    input: CreateMatchListMatchesInput,
  ): Promise<void> {
    const ctx = await ensureBracketOrganizer(actor, input.bracketId);
    if (ctx.type !== BracketType.match_list) {
      throw new AppError(
        "CONFLICT",
        "경기 목록 매치는 match_list 브래킷에서만 생성할 수 있습니다.",
      );
    }

    validateMatchListPlacement(input.matches);

    await prisma.$transaction(async (tx) => {
      const existingBracket = await bracketRepository.findBracketWithMatches(
        input.bracketId,
        tx,
      );
      const previousCourts: PreservedCourtAssignment[] =
        existingBracket?.matches.map((m) => ({
          courtId: m.courtId ?? null,
          courtOrder: m.courtOrder ?? null,
          fighterRedId: m.fighterRedId,
          fighterBlueId: m.fighterBlueId,
          matchOrder: m.matchOrder,
        })) ?? [];

      const beforeCount = await bracketRepository.countMatchesByBracketId(
        input.bracketId,
        tx,
      );

      await bracketRepository.deleteBracketMatchesByBracketId(
        input.bracketId,
        tx,
      );

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: input.bracketId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.bracket_reset,
        beforeData: { previousMatchCount: beforeCount },
        afterData: { matchCount: input.matches.length },
      });

      const suggestedCourtId = await resolveSuggestedCourtId(
        ctx.eventId,
        ctx.divisionId,
        input.defaultCourtId,
        tx,
      );
      const pendingCourtOrders = new Map<string, number>();

      for (const row of input.matches) {
        const redFighterId = row.fighterRedId;
        const blueFighterId = row.fighterBlueId;
        if (!redFighterId && !blueFighterId) {
          continue;
        }

        type PlacementRow = Awaited<
          ReturnType<
            typeof bracketRepository.findApprovedApplicationForBracketPlacement
          >
        >;
        let redPlacement: PlacementRow = null;
        let bluePlacement: PlacementRow = null;

        if (redFighterId) {
          redPlacement =
            await bracketRepository.findApprovedApplicationForBracketPlacement(
              ctx.eventId,
              redFighterId,
              ctx.divisionId,
              tx,
            );
          if (!redPlacement) {
            throw new AppError(
              "VALIDATION_ERROR",
              "승인된 신청자만 대진표에 배치할 수 있습니다.",
            );
          }
        }

        if (blueFighterId) {
          bluePlacement =
            await bracketRepository.findApprovedApplicationForBracketPlacement(
              ctx.eventId,
              blueFighterId,
              ctx.divisionId,
              tx,
            );
          if (!bluePlacement) {
            throw new AppError(
              "VALIDATION_ERROR",
              "승인된 신청자만 대진표에 배치할 수 있습니다.",
            );
          }
        }

        const preserved = findPreservedCourtAssignment(previousCourts, {
          fighterRedId: redPlacement?.fighterId ?? null,
          fighterBlueId: bluePlacement?.fighterId ?? null,
          matchOrder: row.matchOrder,
        });
        const courtId = preserved?.courtId ?? suggestedCourtId;
        if (!courtId) {
          throw new AppError(
            "VALIDATION_ERROR",
            "경기장을 선택해 주세요.",
          );
        }
        const courtOrder =
          preserved?.courtOrder ??
          (await nextCourtOrderForCourt(
            ctx.eventId,
            courtId,
            pendingCourtOrders,
            tx,
          ));

        const { id: matchId } = await bracketRepository.createBracketMatch(
          {
            bracketId: input.bracketId,
            round: null,
            roundName: null,
            matchOrder: row.matchOrder,
            globalMatchOrder: row.globalMatchOrder ?? null,
            matchNumber: row.matchNumber ?? null,
            matNumber: row.matNumber ?? null,
            courtId,
            courtOrder,
            fighterRedId: redPlacement?.fighterId ?? null,
            fighterBlueId: bluePlacement?.fighterId ?? null,
            fighterRedSnapshot: redPlacement
              ? buildFighterBracketSnapshot(toBracketSnapshotSource(redPlacement))
              : null,
            fighterBlueSnapshot: bluePlacement
              ? buildFighterBracketSnapshot(toBracketSnapshotSource(bluePlacement))
              : null,
          },
          tx,
        );

        await appendChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: input.bracketId,
          matchId,
          changedByUserId: actor.userId,
          bracketType: ctx.type,
          changeType: BracketChangeType.fighter_assigned,
          afterData: {
            fighterRedId: redPlacement?.fighterId ?? null,
            fighterBlueId: bluePlacement?.fighterId ?? null,
            matchOrder: row.matchOrder,
          },
        });
      }
    });
  },

  async createSingleEliminationDraft(
    actor: ActorContext,
    input: CreateSingleEliminationDraftInput,
  ): Promise<void> {
    const ctx = await ensureBracketOrganizer(actor, input.bracketId);
    if (ctx.type !== BracketType.single_elimination) {
      throw new AppError(
        "CONFLICT",
        "토너먼트 드래프트는 single_elimination 브래킷에서만 생성할 수 있습니다.",
      );
    }

    await eventCourtService.ensureActiveCourtForEvent(
      actor,
      ctx.eventId,
      input.courtId,
    );

    await prisma.$transaction(async (tx) => {
      const fighterSnapshotIds =
        await notificationRepository.listCornerFighterIdsForBracket(
          input.bracketId,
          tx,
        );

      const beforeCount = await bracketRepository.countMatchesByBracketId(
        input.bracketId,
        tx,
      );

      await bracketRepository.deleteBracketMatchesByBracketId(
        input.bracketId,
        tx,
      );

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: input.bracketId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.bracket_reset,
        beforeData: { previousMatchCount: beforeCount },
        afterData: { slotCount: input.slotCount },
      });

      await createSingleEliminationTree(
        tx,
        input.bracketId,
        input.slotCount,
        ctx.eventId,
        ctx.divisionId,
        input.courtId,
      );

      const ev = await notificationRepository.getEventSlugTitle(ctx.eventId, tx);
      const br = await bracketRepository.findBracketById(input.bracketId, tx);
      if (ev?.publicSlug && br && fighterSnapshotIds.length > 0) {
        await tryNotify("bracket-changed", () =>
          notificationService.notifyBracketChanged(
          {
            eventId: ctx.eventId,
            publicSlug: ev.publicSlug,
            bracketId: input.bracketId,
            bracketTitle: br.title,
            summaryLine: "토너먼트 대진 구조가 다시 생성되었습니다.",
            scope: "bracket_all",
            fighterIdsOverride: fighterSnapshotIds,
          },
          tx,
          ),
        );
      }
    });
  },

  /**
   * 수동 배정 정책:
   * - 자동대진(auto-match): 동일 체육관 페어는 hard exclude
   * - 수동 배정(본 함수): 동일 체육관 허용 (별도 하드 블록·경고 없음)
   */
  async assignFighterToMatch(
    actor: ActorContext,
    input: AssignFighterToMatchInput,
  ): Promise<void> {
    const ctx = await ensureBracketOrganizer(actor, input.bracketId);

    await prisma.$transaction(async (tx) => {
      const mctx = await bracketRepository.findMatchOwnershipContext(
        input.matchId,
        tx,
      );
      if (!mctx || mctx.bracketId !== input.bracketId) {
        throw new AppError("NOT_FOUND", "매치를 찾을 수 없습니다.");
      }

      const match = await bracketRepository.findBracketMatchById(
        input.matchId,
        tx,
      );
      if (!match || match.bracketId !== input.bracketId) {
        throw new AppError("NOT_FOUND", "매치를 찾을 수 없습니다.");
      }

      const row =
        await bracketRepository.findApprovedApplicationForBracketPlacement(
          ctx.eventId,
          input.fighterId,
          ctx.divisionId,
          tx,
        );
      if (!row) {
        throw new AppError(
          "VALIDATION_ERROR",
          "승인된 신청 선수만 배치할 수 있습니다.",
        );
      }

      const assignability = computeBracketAssignability({
        checkInStatus: row.checkInStatus,
        weighInStatus: row.weighInStatus,
        weighInFailureResolution: row.weighInFailureResolution,
        applicationStatus: row.status,
        cancellationSource: row.cancellationSource,
        weighInWeightKg: row.weighInWeightKg,
      });
      if (!assignability.isAssignable) {
        throw new AppError(
          "VALIDATION_ERROR",
          assignability.disabledReason ??
            "출전 불가 상태의 선수는 대진에 배치할 수 없습니다.",
        );
      }

      const elsewhere =
        await bracketRepository.countFighterAssignmentsInBracketExcluding(
          input.bracketId,
          input.fighterId,
          input.matchId,
          tx,
        );
      if (elsewhere > 0) {
        if (input.allowDuplicateAssignment) {
          // 복수 출전: 기존 슬롯 유지. same-bracket 내 추가 배정만 허용.
        } else if (input.moveFromOtherMatch) {
          const prev = await bracketRepository.findFighterAssignmentInBracketExcluding(
            input.bracketId,
            input.fighterId,
            input.matchId,
            tx,
          );
          if (prev) {
            if (prev.slot === "red") {
              await bracketRepository.updateBracketMatch(
                prev.matchId,
                {
                  fighterRedId: null,
                  fighterRedSnapshot: Prisma.JsonNull,
                },
                tx,
              );
            } else {
              await bracketRepository.updateBracketMatch(
                prev.matchId,
                {
                  fighterBlueId: null,
                  fighterBlueSnapshot: Prisma.JsonNull,
                },
                tx,
              );
            }
            await appendChangeLog(tx, {
              eventId: ctx.eventId,
              bracketId: input.bracketId,
              matchId: prev.matchId,
              changedByUserId: actor.userId,
              bracketType: ctx.type,
              changeType: BracketChangeType.fighter_removed,
              beforeData: { slot: prev.slot, fighterId: input.fighterId },
              afterData: { slot: prev.slot, fighterId: null },
              reason: "다른 경기에서 선수 이동",
            });
          }
        } else {
          throw new AppError(
            "CONFLICT",
            "이 선수는 이미 이 대진표의 다른 경기에 배치되어 있습니다.",
          );
        }
      }

      const snap = buildFighterBracketSnapshot(toBracketSnapshotSource(row));
      const prevRedId = match.fighterRedId;
      const prevBlueId = match.fighterBlueId;

      if (input.slot === "red") {
        if (prevBlueId === input.fighterId) {
          throw new AppError(
            "VALIDATION_ERROR",
            "동일 선수를 레드·블루에 동시에 둘 수 없습니다.",
          );
        }
        const changeType =
          prevRedId && prevRedId !== input.fighterId
            ? BracketChangeType.opponent_changed
            : BracketChangeType.fighter_assigned;

        await bracketRepository.updateBracketMatch(
          input.matchId,
          {
            fighterRedId: input.fighterId,
            fighterRedSnapshot: snap,
          },
          tx,
        );

        await appendChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: input.bracketId,
          matchId: input.matchId,
          changedByUserId: actor.userId,
          bracketType: ctx.type,
          changeType,
          beforeData: {
            slot: "red",
            fighterId: prevRedId,
          },
          afterData: { slot: "red", fighterId: input.fighterId },
          reason: input.reason ?? undefined,
        });
      } else {
        if (prevRedId === input.fighterId) {
          throw new AppError(
            "VALIDATION_ERROR",
            "동일 선수를 레드·블루에 동시에 둘 수 없습니다.",
          );
        }
        const changeType =
          prevBlueId && prevBlueId !== input.fighterId
            ? BracketChangeType.opponent_changed
            : BracketChangeType.fighter_assigned;

        await bracketRepository.updateBracketMatch(
          input.matchId,
          {
            fighterBlueId: input.fighterId,
            fighterBlueSnapshot: snap,
          },
          tx,
        );

        await appendChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: input.bracketId,
          matchId: input.matchId,
          changedByUserId: actor.userId,
          bracketType: ctx.type,
          changeType,
          beforeData: {
            slot: "blue",
            fighterId: prevBlueId,
          },
          afterData: { slot: "blue", fighterId: input.fighterId },
          reason: input.reason ?? undefined,
        });
      }

      const ev = await notificationRepository.getEventSlugTitle(ctx.eventId, tx);
      const br = await bracketRepository.findBracketById(input.bracketId, tx);
      if (ev?.publicSlug && br) {
        await tryNotify("bracket-changed", () =>
          notificationService.notifyBracketChanged(
          {
            eventId: ctx.eventId,
            publicSlug: ev.publicSlug,
            bracketId: input.bracketId,
            bracketTitle: br.title,
            summaryLine: "대진표 배치가 변경되었습니다.",
            scope: "match",
            matchId: input.matchId,
          },
          tx,
          ),
        );
      }
    });
  },

  async updateMatchOrderAndMat(
    actor: ActorContext,
    input: UpdateMatchOrderAndMatInput,
  ): Promise<void> {
    const mctx = await bracketRepository.findMatchOwnershipContext(input.matchId);
    if (!mctx) {
      throw new AppError("NOT_FOUND", "매치를 찾을 수 없습니다.");
    }
    const ctx = await ensureBracketOrganizer(actor, mctx.bracketId);

    const match = await bracketRepository.findBracketMatchById(input.matchId);
    if (!match) {
      throw new AppError("NOT_FOUND", "매치를 찾을 수 없습니다.");
    }

    await prisma.$transaction(async (tx) => {
      const patch: Prisma.BracketMatchUncheckedUpdateInput = {};
      if (input.matchOrder !== undefined) {
        patch.matchOrder = input.matchOrder;
      }
      if (input.globalMatchOrder !== undefined) {
        patch.globalMatchOrder = input.globalMatchOrder;
      }
      if (input.matNumber !== undefined) {
        patch.matNumber = input.matNumber;
      }

      await bracketRepository.updateBracketMatch(input.matchId, patch, tx);

      if (
        input.matchOrder !== undefined &&
        input.matchOrder !== match.matchOrder
      ) {
        await appendChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: mctx.bracketId,
          matchId: input.matchId,
          changedByUserId: actor.userId,
          bracketType: ctx.type,
          changeType: BracketChangeType.match_order_changed,
          beforeData: { matchOrder: match.matchOrder },
          afterData: { matchOrder: input.matchOrder },
          reason: input.reason ?? undefined,
        });
      }

      if (
        input.globalMatchOrder !== undefined &&
        input.globalMatchOrder !== match.globalMatchOrder
      ) {
        await appendChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: mctx.bracketId,
          matchId: input.matchId,
          changedByUserId: actor.userId,
          bracketType: ctx.type,
          changeType: BracketChangeType.global_order_changed,
          beforeData: { globalMatchOrder: match.globalMatchOrder },
          afterData: { globalMatchOrder: input.globalMatchOrder },
          reason: input.reason ?? undefined,
        });
      }

      if (
        input.matNumber !== undefined &&
        input.matNumber !== match.matNumber
      ) {
        await appendChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: mctx.bracketId,
          matchId: input.matchId,
          changedByUserId: actor.userId,
          bracketType: ctx.type,
          changeType: BracketChangeType.mat_changed,
          beforeData: { matNumber: match.matNumber },
          afterData: { matNumber: input.matNumber },
          reason: input.reason ?? undefined,
        });
      }

      const ev = await notificationRepository.getEventSlugTitle(ctx.eventId, tx);
      const br = await bracketRepository.findBracketById(mctx.bracketId, tx);
      if (ev?.publicSlug && br) {
        await tryNotify("bracket-changed", () =>
          notificationService.notifyBracketChanged(
          {
            eventId: ctx.eventId,
            publicSlug: ev.publicSlug,
            bracketId: mctx.bracketId,
            bracketTitle: br.title,
            summaryLine: "경기 순서·매트 정보가 변경되었습니다.",
            scope: "match",
            matchId: input.matchId,
          },
          tx,
          ),
        );
      }
    });
  },

  async reorderBracketMatch(
    actor: ActorContext,
    input: { matchId: string; direction: "up" | "down" },
  ): Promise<void> {
    const mctx = await bracketRepository.findMatchOwnershipContext(input.matchId);
    if (!mctx) {
      throw new AppError("NOT_FOUND", "매치를 찾을 수 없습니다.");
    }
    const ctx = await ensureBracketOrganizer(actor, mctx.bracketId);

    const raw = await bracketRepository.listBracketMatchesForOrder(mctx.bracketId);
    if (raw.length < 2) {
      throw new AppError("VALIDATION_ERROR", "순서를 변경할 경기가 충분하지 않습니다.");
    }

    const sorted = sortMatchesByOrder(raw);
    const idx = sorted.findIndex((m) => m.id === input.matchId);
    if (idx < 0) {
      throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    }
    const neighborIdx = input.direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= sorted.length) {
      throw new AppError("VALIDATION_ERROR", "더 이상 이동할 수 없습니다.");
    }

    const current = sorted[idx]!;
    const neighbor = sorted[neighborIdx]!;

    if (current.matchResults.length > 0 || neighbor.matchResults.length > 0) {
      throw new AppError(
        "CONFLICT",
        "공식 결과가 확정된 경기는 순서를 변경할 수 없습니다.",
      );
    }

    const patches = buildOrderSwapPatches(current, neighbor);

    await prisma.$transaction(async (tx) => {
      for (const patch of patches) {
        await bracketRepository.updateBracketMatch(patch.id, patch.data, tx);
      }
      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: mctx.bracketId,
        matchId: input.matchId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.match_order_changed,
        afterData: {
          direction: input.direction,
          swappedWith: neighbor.id,
        },
        reason: "경기 순서 변경",
      });
    });
  },

  async removeFighterFromMatch(
    actor: ActorContext,
    input: RemoveFighterFromMatchInput,
  ): Promise<void> {
    const ctx = await ensureBracketOrganizer(actor, input.bracketId);

    await prisma.$transaction(async (tx) => {
      const match = await bracketRepository.findBracketMatchById(
        input.matchId,
        tx,
      );
      if (!match || match.bracketId !== input.bracketId) {
        throw new AppError("NOT_FOUND", "매치를 찾을 수 없습니다.");
      }

      const before =
        input.slot === "red"
          ? { fighterId: match.fighterRedId }
          : { fighterId: match.fighterBlueId };

      if (input.slot === "red") {
        await bracketRepository.updateBracketMatch(
          input.matchId,
          {
            fighterRedId: null,
            fighterRedSnapshot: Prisma.JsonNull,
          },
          tx,
        );
      } else {
        await bracketRepository.updateBracketMatch(
          input.matchId,
          {
            fighterBlueId: null,
            fighterBlueSnapshot: Prisma.JsonNull,
          },
          tx,
        );
      }

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: input.bracketId,
        matchId: input.matchId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.fighter_removed,
        beforeData: { slot: input.slot, ...before },
        afterData: { slot: input.slot, fighterId: null },
        reason: input.reason ?? undefined,
      });

      const ev = await notificationRepository.getEventSlugTitle(ctx.eventId, tx);
      const br = await bracketRepository.findBracketById(input.bracketId, tx);
      if (ev?.publicSlug && br) {
        await tryNotify("bracket-changed", () =>
          notificationService.notifyBracketChanged(
          {
            eventId: ctx.eventId,
            publicSlug: ev.publicSlug,
            bracketId: input.bracketId,
            bracketTitle: br.title,
            summaryLine: "대진표 배치가 변경되었습니다.",
            scope: "match",
            matchId: input.matchId,
          },
          tx,
          ),
        );
      }
    });
  },

  async addEmptyBracketMatch(
    actor: ActorContext,
    input: { bracketId: string; defaultCourtId?: string },
  ): Promise<{ matchId: string }> {
    const ctx = await ensureBracketOrganizer(actor, input.bracketId);
    if (ctx.type !== BracketType.match_list) {
      throw new AppError(
        "VALIDATION_ERROR",
        "경기 목록 대진표에서만 빈 경기를 추가할 수 있습니다.",
      );
    }

    return prisma.$transaction(async (tx) => {
      const nextOrder =
        (await bracketRepository.getMaxMatchOrderForBracket(
          input.bracketId,
          tx,
        )) + 1;
      const courtId = await resolveSuggestedCourtId(
        ctx.eventId,
        ctx.divisionId,
        input.defaultCourtId ?? null,
        tx,
      );
      if (!courtId) {
        throw new AppError("VALIDATION_ERROR", "경기장을 선택해 주세요.");
      }
      const pendingCourtOrders = new Map<string, number>();
      const courtOrder = await nextCourtOrderForCourt(
        ctx.eventId,
        courtId,
        pendingCourtOrders,
        tx,
      );
      const matchNumber = await nextEventWideMatchNumber(ctx.eventId, tx);

      const { id } = await bracketRepository.createBracketMatch(
        {
          bracketId: input.bracketId,
          matchOrder: nextOrder,
          matchNumber,
          courtId,
          courtOrder,
        },
        tx,
      );

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: input.bracketId,
        matchId: id,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.bracket_created,
        afterData: { matchOrder: nextOrder, matchNumber, courtId, courtOrder },
        reason: "빈 경기 추가",
      });

      await applyEventWideMatchNumberResequence(ctx.eventId, tx);

      return { matchId: id };
    });
  },

  /**
   * 미배정 2명으로 수동 경기 1개 생성 (D&D / tap Confirm 후).
   * 기존 addEmpty + assign 경로와 동일 Match CRUD를 한 트랜잭션으로 수행.
   */
  async createManualMatchWithPair(
    actor: ActorContext,
    input: {
      bracketId: string;
      redFighterId: string;
      blueFighterId: string;
      defaultCourtId?: string;
      /** 수동 복수 출전만. 기본 false = event-wide placed CONFLICT 유지 */
      allowDuplicateAssignment?: boolean;
    },
  ): Promise<{ matchId: string; eventId: string }> {
    const ctx = await ensureBracketOrganizer(actor, input.bracketId);
    if (ctx.type !== BracketType.match_list) {
      throw new AppError(
        "VALIDATION_ERROR",
        "경기 목록 대진표에서만 수동 경기를 추가할 수 있습니다.",
      );
    }
    if (input.redFighterId === input.blueFighterId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "동일 선수를 홍·청 코너에 동시에 둘 수 없습니다.",
      );
    }

    const allowDuplicate = input.allowDuplicateAssignment === true;

    return prisma.$transaction(async (tx) => {
      async function loadUnmatchedForManualPair(fighterId: string) {
        const row =
          await bracketRepository.findApprovedApplicationForEventPlacement(
            ctx.eventId,
            fighterId,
            tx,
          );
        if (!row) {
          throw new AppError(
            "VALIDATION_ERROR",
            "승인된 신청 선수만 배치할 수 있습니다.",
          );
        }
        const assignability = computeBracketAssignability({
          checkInStatus: row.checkInStatus,
          weighInStatus: row.weighInStatus,
          weighInFailureResolution: row.weighInFailureResolution,
          applicationStatus: row.status,
          cancellationSource: row.cancellationSource,
          weighInWeightKg: row.weighInWeightKg,
        });
        if (!assignability.isAssignable) {
          throw new AppError(
            "VALIDATION_ERROR",
            assignability.disabledReason ??
              "출전 불가 상태의 선수는 대진에 배치할 수 없습니다.",
          );
        }
        const placed =
          await bracketRepository.countFighterAssignmentsInEvent(
            ctx.eventId,
            fighterId,
            tx,
          );
        if (placed > 0) {
          if (!allowDuplicate) {
            throw new AppError(
              "CONFLICT",
              "다른 관리자가 이미 이 선수를 경기에 배정했습니다. 목록을 새로고침합니다.",
            );
          }
          // 복수 출전은 same-division만 — divisionId 이동이 기존 Match SSOT를 흔들 수 있음
          if (
            !ctx.divisionId ||
            !row.divisionId ||
            row.divisionId !== ctx.divisionId
          ) {
            throw new AppError(
              "VALIDATION_ERROR",
              "이미 배정된 선수의 다른 경기구분 복수 출전은 아직 지원하지 않습니다. 같은 경기구분 그룹에서만 추가 배정할 수 있습니다.",
            );
          }
        }
        return { row, placed };
      }

      async function ensureAssignedToBracketDivision(
        row: ApprovedApplicationForBracketRow,
        alreadyPlaced: number,
      ): Promise<ApprovedApplicationForBracketRow> {
        if (!ctx.divisionId) {
          throw new AppError(
            "VALIDATION_ERROR",
            "경기구분이 없는 대진표에서는 교차 편성할 수 없습니다.",
          );
        }
        if (row.divisionId === ctx.divisionId) return row;

        // 이미 배정된 선수의 division 이동 금지 (복수 출전 안전장치)
        if (alreadyPlaced > 0) {
          throw new AppError(
            "VALIDATION_ERROR",
            "이미 배정된 선수의 다른 경기구분 복수 출전은 아직 지원하지 않습니다.",
          );
        }

        const belongs = await eventRepository.findDivisionBelongsToEvent(
          ctx.divisionId,
          ctx.eventId,
        );
        if (!belongs) {
          throw new AppError(
            "VALIDATION_ERROR",
            "대상 경기구분을 찾을 수 없습니다.",
          );
        }

        const fromDivisionId = row.divisionId;
        await applicationRepository.updateApplicationDivisionAssignment(
          row.id,
          ctx.divisionId,
          tx,
        );

        await appendChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: input.bracketId,
          changedByUserId: actor.userId,
          bracketType: ctx.type,
          changeType: BracketChangeType.bracket_created,
          beforeData: {
            applicationId: row.id,
            fighterId: row.fighterId,
            fromDivisionId,
          },
          afterData: {
            applicationId: row.id,
            fighterId: row.fighterId,
            toDivisionId: ctx.divisionId,
            source: "cross_division_manual_match",
          },
          reason: "교차 경기구분 수동 편성 — 배정 이동",
        });

        const moved =
          await bracketRepository.findApprovedApplicationForEventPlacement(
            ctx.eventId,
            row.fighterId,
            tx,
          );
        if (!moved) {
          throw new AppError(
            "CONFLICT",
            "선수 배정 상태가 변경되었습니다. 목록을 새로고침합니다.",
          );
        }
        return moved;
      }

      const redLoaded = await loadUnmatchedForManualPair(input.redFighterId);
      const blueLoaded = await loadUnmatchedForManualPair(input.blueFighterId);
      let redRow = redLoaded.row;
      let blueRow = blueLoaded.row;

      const crossDivisionMove = Boolean(
        ctx.divisionId &&
          ((redRow.divisionId && redRow.divisionId !== ctx.divisionId) ||
            (blueRow.divisionId && blueRow.divisionId !== ctx.divisionId)),
      );

      redRow = await ensureAssignedToBracketDivision(
        redRow,
        redLoaded.placed,
      );
      blueRow = await ensureAssignedToBracketDivision(
        blueRow,
        blueLoaded.placed,
      );

      const nextOrder =
        (await bracketRepository.getMaxMatchOrderForBracket(
          input.bracketId,
          tx,
        )) + 1;
      const courtId = await resolveSuggestedCourtId(
        ctx.eventId,
        ctx.divisionId,
        input.defaultCourtId ?? null,
        tx,
      );
      if (!courtId) {
        throw new AppError("VALIDATION_ERROR", "경기장을 선택해 주세요.");
      }
      const pendingCourtOrders = new Map<string, number>();
      const courtOrder = await nextCourtOrderForCourt(
        ctx.eventId,
        courtId,
        pendingCourtOrders,
        tx,
      );
      const matchNumber = await nextEventWideMatchNumber(ctx.eventId, tx);

      const { id: matchId } = await bracketRepository.createBracketMatch(
        {
          bracketId: input.bracketId,
          matchOrder: nextOrder,
          matchNumber,
          courtId,
          courtOrder,
          fighterRedId: input.redFighterId,
          fighterRedSnapshot: buildFighterBracketSnapshot(
            toBracketSnapshotSource(redRow),
          ),
          fighterBlueId: input.blueFighterId,
          fighterBlueSnapshot: buildFighterBracketSnapshot(
            toBracketSnapshotSource(blueRow),
          ),
        },
        tx,
      );

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: input.bracketId,
        matchId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.bracket_created,
        afterData: {
          matchOrder: nextOrder,
          matchNumber,
          courtId,
          courtOrder,
          fighterRedId: input.redFighterId,
          fighterBlueId: input.blueFighterId,
          source: "manual_pair_dnd",
          crossDivisionMove,
        },
        reason: "수동 경기 만들기",
      });

      await applyEventWideMatchNumberResequence(ctx.eventId, tx);

      return { matchId, eventId: ctx.eventId };
    }, BRACKET_MUTATION_TX_OPTIONS);
  },

  async deleteBracketMatch(
    actor: ActorContext,
    input: DeleteBracketMatchInput,
  ): Promise<{ eventId: string; bracketId: string }> {
    const ctx = await ensureBracketOrganizer(actor, input.bracketId);
    if (ctx.type !== BracketType.match_list) {
      throw new AppError(
        "VALIDATION_ERROR",
        "경기 목록 대진표에서만 경기를 삭제할 수 있습니다.",
      );
    }

    await prisma.$transaction(
      async (tx) => {
      const match = await bracketRepository.findBracketMatchById(
        input.matchId,
        tx,
      );
      if (!match || match.bracketId !== input.bracketId) {
        throw new AppError("NOT_FOUND", "매치를 찾을 수 없습니다.");
      }

      const officialCount = await tx.matchResult.count({
        where: {
          matchId: input.matchId,
          status: {
            in: [
              MatchRecordStatus.confirmed,
              MatchRecordStatus.corrected,
            ],
          },
        },
      });
      if (officialCount >= 2) {
        throw new AppError(
          "CONFLICT",
          "공식 결과가 확정된 경기는 삭제할 수 없습니다.",
        );
      }

      const fighterSnapshotIds = [
        match.fighterRedId,
        match.fighterBlueId,
      ].filter((id): id is string => Boolean(id));

      await bracketRepository.deleteBracketMatchById(input.matchId, tx);

      for (const fighterId of fighterSnapshotIds) {
        const remainingCount =
          await bracketRepository.countFighterAssignmentsInEvent(
            ctx.eventId,
            fighterId,
            tx,
          );
        if (remainingCount < 2) {
          await applicationRepository.clearMultiMatchConfirmationByFighterIds(
            ctx.eventId,
            [fighterId],
            tx,
          );
        }
      }

      const remaining = await bracketRepository.listBracketMatchesForOrder(
        input.bracketId,
        tx,
      );
      const sorted = sortMatchesByOrder(remaining);
      for (let i = 0; i < sorted.length; i++) {
        const row = sorted[i]!;
        if (row.matchOrder !== i) {
          await bracketRepository.updateBracketMatch(
            row.id,
            { matchOrder: i },
            tx,
          );
        }
      }

      // 화면 「N경기」SSOT = event-wide matchNumber. courtOrder는 경기장 내부용.
      const deletedCourtId = match.courtId;
      if (deletedCourtId) {
        const peers = await tx.bracketMatch.findMany({
          where: {
            courtId: deletedCourtId,
            bracket: { eventId: ctx.eventId },
          },
          select: { id: true, courtId: true, courtOrder: true },
        });
        const courtUpdates = renumberAllCourtOrders(
          peers.map((m) => ({
            matchId: m.id,
            courtId: m.courtId,
            courtOrder: m.courtOrder,
          })),
        );
        for (const u of courtUpdates) {
          const prev = peers.find((m) => m.id === u.matchId);
          if (!prev || prev.courtOrder === u.courtOrder) continue;
          await matchRepository.updateMatchCourt(
            u.matchId,
            { courtId: u.courtId, courtOrder: u.courtOrder },
            tx,
          );
        }
      }

      await applyEventWideMatchNumberResequence(ctx.eventId, tx);

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: input.bracketId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.match_cancelled,
        beforeData: {
          matchId: input.matchId,
          matchOrder: match.matchOrder,
          courtId: match.courtId,
          courtOrder: match.courtOrder,
          fighterRedId: match.fighterRedId,
          fighterBlueId: match.fighterBlueId,
        },
        afterData: {
          deleted: true,
          renumbered: true,
          courtOrdersRenumbered: Boolean(deletedCourtId),
          eventWideMatchNumbersRenumbered: true,
        },
        reason: "경기 삭제",
      });

      const ev = await notificationRepository.getEventSlugTitle(ctx.eventId, tx);
      const br = await bracketRepository.findBracketById(input.bracketId, tx);
      if (ev?.publicSlug && br && fighterSnapshotIds.length > 0) {
        await tryNotify("bracket-changed", () =>
          notificationService.notifyBracketChanged(
            {
              eventId: ctx.eventId,
              publicSlug: ev.publicSlug,
              bracketId: input.bracketId,
              bracketTitle: br.title,
              summaryLine: "경기가 삭제되어 대진 배치가 변경되었습니다.",
              scope: "bracket_all",
              fighterIdsOverride: fighterSnapshotIds,
            },
            tx,
          ),
        );
      }
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    return { eventId: ctx.eventId, bracketId: input.bracketId };
  },

  async resetBracket(actor: ActorContext, input: ResetBracketInput): Promise<void> {
    const ctx = await ensureBracketOrganizer(actor, input.bracketId);

    await prisma.$transaction(async (tx) => {
      const fighterSnapshotIds =
        await notificationRepository.listCornerFighterIdsForBracket(
          input.bracketId,
          tx,
        );

      const beforeCount = await bracketRepository.countMatchesByBracketId(
        input.bracketId,
        tx,
      );

      await bracketRepository.deleteBracketMatchesByBracketId(
        input.bracketId,
        tx,
      );

      await appendChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: input.bracketId,
        changedByUserId: actor.userId,
        bracketType: ctx.type,
        changeType: BracketChangeType.bracket_reset,
        beforeData: { previousMatchCount: beforeCount },
        afterData: { cleared: true },
        reason: input.reason ?? undefined,
      });

      const ev = await notificationRepository.getEventSlugTitle(ctx.eventId, tx);
      const br = await bracketRepository.findBracketById(input.bracketId, tx);
      if (ev?.publicSlug && br && fighterSnapshotIds.length > 0) {
        await tryNotify("bracket-changed", () =>
          notificationService.notifyBracketChanged(
          {
            eventId: ctx.eventId,
            publicSlug: ev.publicSlug,
            bracketId: input.bracketId,
            bracketTitle: br.title,
            summaryLine: "대진표가 초기화되었습니다.",
            scope: "bracket_all",
            fighterIdsOverride: fighterSnapshotIds,
          },
          tx,
          ),
        );
      }
    });
  },

  async getPublicBracketsByEventSlug(slug: string): Promise<PublicBracketDetailDTO[]> {
    const rows = await bracketRepository.listPublicBracketsByEventSlug(slug);
    if (rows.length === 0) return [];

    const eventId = rows[0]?.eventId;
    const handicapRows = eventId
      ? await applicationRepository.listFighterHandicapFieldsForEvent(eventId)
      : [];
    const handicapMap = buildFighterHandicapMap(handicapRows);

    const courts = eventId
      ? await eventCourtRepository.listAllByEvent(eventId)
      : [];

    return rows.map((b): PublicBracketDetailDTO => {
      const division = toEventDivisionDisplayInput(b.division);
      const divisionLabel = division
        ? formatDivisionNameLabel(division)
        : null;

      const matches: PublicBracketMatchDTO[] = b.matches.map((m) => {
        const ops = parseMatchOperationalSettings(m.resultMemo);
        return {
        id: m.id,
        round: m.round,
        roundName: m.roundName,
        matchOrder: m.matchOrder,
        globalMatchOrder: m.globalMatchOrder,
        matchNumber: m.matchNumber,
        matNumber: m.matNumber,
        courtName: m.court?.name ?? null,
        courtId: m.courtId ?? null,
        courtOrder: m.courtOrder ?? null,
        fighterRed: snapshotToPublic(m.fighterRedSnapshot, handicapMap),
        fighterBlue: snapshotToPublic(m.fighterBlueSnapshot, handicapMap),
        status: m.status,
        winnerId: m.winnerId,
        loserId: m.loserId,
        resultType: m.resultType,
        matchIsPublicSparring: resolveMatchIsPublicSparring({
          bracketType: b.type,
          bracketIsPublic: true,
          resultMemo: m.resultMemo,
        }),
        operationalSettingsLabel: formatOperationalSettingsLabel(ops.settings),
      };
      });

      const sortedMatches = sortMatchesByCourtSchedule(
        matches.map((m) => ({
          ...m,
          matchId: m.id,
          courtId: m.courtId ?? null,
          courtOrder: m.courtOrder ?? null,
        })),
        courts.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
      );

      return {
        id: b.id,
        title: b.title,
        displayTitle: formatBracketTitleForDisplay(b.title, division),
        type: b.type,
        status: b.status,
        division,
        divisionLabel,
        matches: sortedMatches,
      };
    });
  },

  async listEventDuplicateAssignmentIssues(
    actor: ActorContext,
    eventId: string,
  ): Promise<{
    issues: BracketDuplicateAssignmentIssue[];
    unconfirmedCount: number;
    confirmedCount: number;
  }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const matches =
      await bracketRepository.listActiveMatchesForDuplicateValidation(eventId);

    type Acc = {
      matchIds: string[];
      details: BracketDuplicateMatchDetail[];
    };
    const byFighter = new Map<string, Acc>();

    function pushSide(
      fighterId: string | null,
      corner: "홍" | "청",
      match: (typeof matches)[number],
      opponentSnapshot: unknown,
    ) {
      if (!fighterId) return;
      const opponent = parseBracketFighterSnapshot(opponentSnapshot);
      const divisionInput = toEventDivisionDisplayInput(match.bracket.division);
      const acc = byFighter.get(fighterId) ?? { matchIds: [], details: [] };
      acc.matchIds.push(match.id);
      acc.details.push({
        matchId: match.id,
        matchLabel: formatMatchOrderShort({
          matchOrder: match.matchOrder,
          globalMatchOrder: match.globalMatchOrder,
          matchNumber: match.matchNumber,
        }),
        corner,
        opponentName: opponent?.name?.trim() || "미배정",
        divisionLabel: divisionInput
          ? formatDivisionMainLabel(divisionInput) || "경기구분 미지정"
          : "경기구분 미지정",
        bracketId: match.bracketId,
      });
      byFighter.set(fighterId, acc);
    }

    for (const match of matches) {
      pushSide(
        match.fighterRedId,
        "홍",
        match,
        match.fighterBlueSnapshot,
      );
      pushSide(
        match.fighterBlueId,
        "청",
        match,
        match.fighterRedSnapshot,
      );
    }

    const duplicateFighterIds = [...byFighter.entries()]
      .filter(([, acc]) => acc.matchIds.length >= 2)
      .map(([id]) => id);

    if (duplicateFighterIds.length === 0) {
      return { issues: [], unconfirmedCount: 0, confirmedCount: 0 };
    }

    const applications = await prisma.eventApplication.findMany({
      where: {
        eventId,
        fighterId: { in: duplicateFighterIds },
        status: { not: ApplicationStatus.cancelled },
      },
      select: {
        id: true,
        fighterId: true,
        gymNameSnapshot: true,
        gymSnapshot: true,
        multiMatchConfirmedAt: true,
        multiMatchConfirmedSignature: true,
        fighter: { select: { name: true } },
        gym: { select: { name: true } },
      },
    });

    const appByFighter = new Map(applications.map((a) => [a.fighterId, a]));

    const issues: BracketDuplicateAssignmentIssue[] = [];
    for (const fighterId of duplicateFighterIds) {
      const acc = byFighter.get(fighterId)!;
      const app = appByFighter.get(fighterId);
      if (!app) continue;
      const confirmed = isMultiMatchConfirmationValid({
        currentMatchIds: acc.matchIds,
        confirmedSignature: app.multiMatchConfirmedSignature,
      });
      issues.push({
        type: "DUPLICATE_ASSIGNMENT",
        fighterId,
        applicationId: app.id,
        fighterName: app.fighter.name,
        gymName: resolveApplicationGymDisplayName({
          gymNameSnapshot: app.gymNameSnapshot,
          gymSnapshot: app.gymSnapshot,
          gymRelationName: app.gym?.name,
        }),
        matchCount: acc.matchIds.length,
        matches: acc.details,
        confirmed,
        confirmedAt: app.multiMatchConfirmedAt
          ? app.multiMatchConfirmedAt.toISOString()
          : null,
      });
    }

    issues.sort((a, b) => {
      if (a.confirmed !== b.confirmed) return a.confirmed ? 1 : -1;
      if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount;
      return a.fighterName.localeCompare(b.fighterName, "ko");
    });

    return {
      issues,
      unconfirmedCount: issues.filter((i) => !i.confirmed).length,
      confirmedCount: issues.filter((i) => i.confirmed).length,
    };
  },

  async confirmEventMultiMatch(
    actor: ActorContext,
    input: { eventId: string; applicationId: string },
  ): Promise<{ applicationId: string; signature: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const app = await prisma.eventApplication.findFirst({
      where: { id: input.applicationId, eventId: input.eventId },
      select: { id: true, fighterId: true },
    });
    if (!app) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }

    const matches =
      await bracketRepository.listActiveMatchesForDuplicateValidation(
        input.eventId,
      );
    const matchIds = matches
      .filter(
        (m) =>
          m.fighterRedId === app.fighterId ||
          m.fighterBlueId === app.fighterId,
      )
      .map((m) => m.id);
    if (matchIds.length < 2) {
      throw new AppError(
        "VALIDATION_ERROR",
        "현재 2경기 이상 배정된 선수만 복수 출전으로 확인할 수 있습니다.",
      );
    }

    const signature = buildMultiMatchAssignmentSignature(matchIds);
    await applicationRepository.setMultiMatchConfirmation(app.id, {
      confirmedAt: new Date(),
      confirmedByUserId: actor.userId,
      signature,
    });

    return { applicationId: app.id, signature };
  },

  async clearEventMultiMatchConfirmation(
    actor: ActorContext,
    input: { eventId: string; applicationId: string },
  ): Promise<{ applicationId: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const app = await prisma.eventApplication.findFirst({
      where: { id: input.applicationId, eventId: input.eventId },
      select: { id: true },
    });
    if (!app) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }

    await applicationRepository.clearMultiMatchConfirmation(app.id);
    return { applicationId: app.id };
  },
};
