/**
 * 자동대진 미매칭 설명 — 순수 함수.
 * pairWithRecordAndGrade 결과(reason)는 바꾸지 않고, 동일 division pool로
 * 후보·제외 카운트와 표시용 reasonText만 산출한다.
 */

import { isSameGym } from "@/lib/brackets/gym-match-key";
import {
  getElementaryMatchBand,
  SCHOOL_LEVEL,
  type ElementaryMatchBand,
} from "@/lib/fighter/record";
import type {
  RecordMatchCandidate,
  RecordUnmatchedCandidate,
  RecordUnmatchedReason,
} from "@/lib/brackets/record-auto-match";

/** UI 필터용 reason code (알고리즘 reason과 1:N 매핑 가능) */
export type UnmatchedDetailReasonCode =
  | "no_candidate"
  | "no_zero_candidate"
  | "same_gym"
  | "record_diff"
  | "age_grade"
  | "unknown_record"
  | "not_eligible"
  | "court_capacity"
  | "odd_remaining"
  | "other";

export type UnmatchedCandidateExplanation = {
  reasonCode: UnmatchedDetailReasonCode;
  reasonText: string;
  candidateCount: number;
  excludedSameGymCount: number;
  excludedRecordCount: number;
  excludedAgeCount: number;
  finalCandidateCount: number;
  candidateFlowText: string;
  ownTotalBouts: number | null;
  nearestOpponentBouts: number | null;
};

function elementaryBandOf(
  c: Pick<RecordMatchCandidate, "schoolLevel" | "schoolGrade">,
): ElementaryMatchBand | null {
  if (c.schoolLevel !== SCHOOL_LEVEL.ELEMENTARY) return null;
  if (c.schoolGrade == null) return null;
  return getElementaryMatchBand(c.schoolGrade);
}

function isElementaryBandCompatible(
  a: Pick<RecordMatchCandidate, "schoolLevel" | "schoolGrade">,
  b: Pick<RecordMatchCandidate, "schoolLevel" | "schoolGrade">,
): boolean {
  const bandA = elementaryBandOf(a);
  const bandB = elementaryBandOf(b);
  if (bandA === null && bandB === null) return true;
  return bandA === bandB;
}

function isRecordCompatible(
  self: RecordMatchCandidate,
  peer: RecordMatchCandidate,
): boolean {
  if (self.totalBouts == null || peer.totalBouts == null) return false;
  if (self.totalBouts === 0) return peer.totalBouts === 0;
  if (peer.totalBouts === 0) return false;
  return Math.abs(self.totalBouts - peer.totalBouts) <= 1;
}

function nearestOpponentBouts(
  self: RecordMatchCandidate,
  peers: RecordMatchCandidate[],
): number | null {
  if (self.totalBouts == null) return null;
  let best: number | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const p of peers) {
    if (p.totalBouts == null) continue;
    const d = Math.abs(p.totalBouts - self.totalBouts);
    if (d < bestDiff) {
      bestDiff = d;
      best = p.totalBouts;
    }
  }
  return best;
}

function buildFlowText(input: {
  candidateCount: number;
  excludedAgeCount: number;
  excludedSameGymCount: number;
  excludedRecordCount: number;
  finalCandidateCount: number;
}): string {
  const parts = [`동일 체급 후보 ${input.candidateCount}명`];
  if (input.excludedAgeCount > 0) {
    parts.push(`학년/연령 제외 ${input.excludedAgeCount}명`);
  }
  if (input.excludedSameGymCount > 0) {
    parts.push(`같은 체육관 제외 ${input.excludedSameGymCount}명`);
  }
  if (input.excludedRecordCount > 0) {
    parts.push(`전적 제외 ${input.excludedRecordCount}명`);
  }
  parts.push(`최종 ${input.finalCandidateCount}명`);
  return parts.join(" · ");
}

function explainFromPool(
  self: RecordMatchCandidate,
  peers: RecordMatchCandidate[],
  algorithmReason: RecordUnmatchedReason,
  forbidSameGym: boolean,
): UnmatchedCandidateExplanation {
  const candidateCount = peers.length;

  const ageIncompatible = peers.filter(
    (p) => !isElementaryBandCompatible(self, p),
  );
  const afterAge = peers.filter((p) => isElementaryBandCompatible(self, p));

  const sameGymInAfterAge = afterAge.filter((p) => isSameGym(self, p));
  const afterGym =
    forbidSameGym
      ? afterAge.filter((p) => !isSameGym(self, p))
      : afterAge;

  const recordIncompatible = afterGym.filter((p) => !isRecordCompatible(self, p));
  const afterRecord = afterGym.filter((p) => isRecordCompatible(self, p));

  const excludedAgeCount = ageIncompatible.length;
  const excludedSameGymCount = forbidSameGym ? sameGymInAfterAge.length : 0;
  const excludedRecordCount = recordIncompatible.length;
  const finalCandidateCount = afterRecord.length;

  const flow = {
    candidateCount,
    excludedAgeCount,
    excludedSameGymCount,
    excludedRecordCount,
    finalCandidateCount,
  };

  const nearest = nearestOpponentBouts(self, peers);

  if (algorithmReason === "not_field_eligible") {
    return {
      reasonCode: "not_eligible",
      reasonText: "출전 조건 미충족으로 자동매칭 대상에서 제외되었습니다.",
      ...flow,
      finalCandidateCount: 0,
      candidateFlowText: buildFlowText({ ...flow, finalCandidateCount: 0 }),
      ownTotalBouts: self.totalBouts,
      nearestOpponentBouts: nearest,
    };
  }

  if (algorithmReason === "unknown_record") {
    return {
      reasonCode: "unknown_record",
      reasonText: "전적 정보가 없어 자동매칭할 수 없습니다.",
      ...flow,
      finalCandidateCount: 0,
      candidateFlowText: buildFlowText({ ...flow, finalCandidateCount: 0 }),
      ownTotalBouts: self.totalBouts,
      nearestOpponentBouts: nearest,
    };
  }

  if (algorithmReason === "court_capacity_full") {
    return {
      reasonCode: "court_capacity",
      reasonText: "경기장 최대 경기 수 제한으로 배치되지 않았습니다.",
      candidateCount,
      excludedSameGymCount: 0,
      excludedRecordCount: 0,
      excludedAgeCount: 0,
      finalCandidateCount: 0,
      candidateFlowText: "코트 정원 초과로 배치되지 않음",
      ownTotalBouts: self.totalBouts,
      nearestOpponentBouts: nearest,
    };
  }

  // 무전 풀에서 남은 경우
  if (algorithmReason === "zero_vs_nonzero" || self.totalBouts === 0) {
    const zeroPeers = peers.filter((p) => p.totalBouts === 0);
    const zeroAfterAge = zeroPeers.filter((p) =>
      isElementaryBandCompatible(self, p),
    );
    const zeroDiffGym = forbidSameGym
      ? zeroAfterAge.filter((p) => !isSameGym(self, p))
      : zeroAfterAge;

    if (zeroPeers.length === 0 || zeroAfterAge.length === 0) {
      if (zeroPeers.length === 0) {
        return {
          reasonCode: "no_zero_candidate",
          reasonText:
            "동일 경기구분·성별·체급에 매칭 가능한 무전 선수가 없습니다.",
          candidateCount,
          excludedSameGymCount: forbidSameGym
            ? afterAge.filter((p) => isSameGym(self, p)).length
            : 0,
          excludedRecordCount: afterGym.filter((p) => (p.totalBouts ?? 0) > 0)
            .length,
          excludedAgeCount,
          finalCandidateCount: 0,
          candidateFlowText: buildFlowText({
            candidateCount,
            excludedAgeCount,
            excludedSameGymCount: forbidSameGym
              ? afterAge.filter((p) => isSameGym(self, p)).length
              : 0,
            excludedRecordCount: afterGym.filter((p) => (p.totalBouts ?? 0) > 0)
              .length,
            finalCandidateCount: 0,
          }),
          ownTotalBouts: 0,
          nearestOpponentBouts: nearest,
        };
      }
      return {
        reasonCode: "age_grade",
        reasonText: "연령/학년 조건에 맞는 무전 상대가 없습니다.",
        candidateCount,
        excludedSameGymCount: 0,
        excludedRecordCount: peers.filter((p) => (p.totalBouts ?? 0) > 0).length,
        excludedAgeCount: zeroPeers.length - zeroAfterAge.length,
        finalCandidateCount: 0,
        candidateFlowText: buildFlowText({
          candidateCount,
          excludedAgeCount: zeroPeers.length - zeroAfterAge.length,
          excludedSameGymCount: 0,
          excludedRecordCount: peers.filter((p) => (p.totalBouts ?? 0) > 0)
            .length,
          finalCandidateCount: 0,
        }),
        ownTotalBouts: 0,
        nearestOpponentBouts: nearest,
      };
    }

    if (forbidSameGym && zeroDiffGym.length === 0) {
      return {
        reasonCode: "same_gym",
        reasonText:
          "동일 체급 무전 후보는 있으나 모두 같은 체육관입니다.",
        candidateCount,
        excludedSameGymCount: zeroAfterAge.length,
        excludedRecordCount: peers.filter((p) => (p.totalBouts ?? 0) > 0).length,
        excludedAgeCount,
        finalCandidateCount: 0,
        candidateFlowText: buildFlowText({
          candidateCount,
          excludedAgeCount,
          excludedSameGymCount: zeroAfterAge.length,
          excludedRecordCount: peers.filter((p) => (p.totalBouts ?? 0) > 0)
            .length,
          finalCandidateCount: 0,
        }),
        ownTotalBouts: 0,
        nearestOpponentBouts: nearest,
      };
    }

    return {
      reasonCode: "odd_remaining",
      reasonText:
        "여러 조건을 적용한 결과 최종 매칭 후보가 없습니다.",
      candidateCount,
      excludedSameGymCount: forbidSameGym
        ? zeroAfterAge.filter((p) => isSameGym(self, p)).length
        : 0,
      excludedRecordCount: peers.filter((p) => (p.totalBouts ?? 0) > 0).length,
      excludedAgeCount,
      finalCandidateCount: 0,
      candidateFlowText: buildFlowText({
        candidateCount,
        excludedAgeCount,
        excludedSameGymCount: forbidSameGym
          ? zeroAfterAge.filter((p) => isSameGym(self, p)).length
          : 0,
        excludedRecordCount: peers.filter((p) => (p.totalBouts ?? 0) > 0).length,
        finalCandidateCount: 0,
      }),
      ownTotalBouts: 0,
      nearestOpponentBouts: nearest,
    };
  }

  // 전적 차이 / leftover
  if (candidateCount === 0) {
    return {
      reasonCode: "no_candidate",
      reasonText: "동일 경기구분·성별·체급의 상대가 없습니다.",
      ...flow,
      finalCandidateCount: 0,
      candidateFlowText: buildFlowText({ ...flow, finalCandidateCount: 0 }),
      ownTotalBouts: self.totalBouts,
      nearestOpponentBouts: null,
    };
  }

  if (afterAge.length === 0) {
    return {
      reasonCode: "age_grade",
      reasonText: "연령/학년 조건에 맞는 상대가 없습니다.",
      ...flow,
      finalCandidateCount: 0,
      candidateFlowText: buildFlowText({ ...flow, finalCandidateCount: 0 }),
      ownTotalBouts: self.totalBouts,
      nearestOpponentBouts: nearest,
    };
  }

  if (forbidSameGym && afterGym.length === 0) {
    return {
      reasonCode: "same_gym",
      reasonText: "같은 체육관 후보만 있어 매칭할 수 없습니다.",
      ...flow,
      finalCandidateCount: 0,
      candidateFlowText: buildFlowText({ ...flow, finalCandidateCount: 0 }),
      ownTotalBouts: self.totalBouts,
      nearestOpponentBouts: nearest,
    };
  }

  if (afterRecord.length === 0) {
    const own = self.totalBouts;
    const detail =
      own != null && nearest != null
        ? `본인 ${own}전 / 후보 ${nearest}전 · 허용 차이 초과`
        : "동일 체급 후보는 있으나 현재 자동매칭 전적 기준을 초과합니다.";
    return {
      reasonCode: "record_diff",
      reasonText: detail,
      ...flow,
      finalCandidateCount: 0,
      candidateFlowText: buildFlowText({ ...flow, finalCandidateCount: 0 }),
      ownTotalBouts: self.totalBouts,
      nearestOpponentBouts: nearest,
    };
  }

  return {
    reasonCode: "odd_remaining",
    reasonText:
      "여러 조건을 적용한 결과 최종 매칭 후보가 없습니다.",
    ...flow,
    finalCandidateCount: 0,
    candidateFlowText: buildFlowText({ ...flow, finalCandidateCount: 0 }),
    ownTotalBouts: self.totalBouts,
    nearestOpponentBouts: nearest,
  };
}

/**
 * division 전체 후보 + 알고리즘 unmatched 한 명 → 상세 설명.
 * pairing 자체는 변경하지 않는다.
 */
export function explainRecordUnmatched(
  unmatched: RecordUnmatchedCandidate,
  divisionCandidates: RecordMatchCandidate[],
  options: { forbidSameGym?: boolean } = {},
): UnmatchedCandidateExplanation {
  const forbidSameGym = options.forbidSameGym !== false;
  const peers = divisionCandidates.filter(
    (c) =>
      c.applicationId !== unmatched.applicationId &&
      c.isAssignableForBracket,
  );
  return explainFromPool(unmatched, peers, unmatched.reason, forbidSameGym);
}

export function formatAutoMatchRecordText(input: {
  totalBouts: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
}): string {
  if (input.totalBouts == null) return "전적 정보 없음";
  if (input.totalBouts === 0) return "무전";
  const wins = input.wins;
  const draws = input.draws;
  const losses = input.losses;
  if (wins != null && draws != null && losses != null) {
    const parts = [`${input.totalBouts}전`, `${wins}승`];
    if (draws > 0) parts.push(`${draws}무`);
    parts.push(`${losses}패`);
    return parts.join(" ");
  }
  return `${input.totalBouts}전`;
}

/** 미리보기 표시용 — 구조화 전적 우선, 없으면 free-text, 둘 다 없으면 안내 문구 */
export function formatPreviewApplicationRecord(input: {
  totalBoutsSnapshot: number | null;
  winsSnapshot: number | null;
  drawsSnapshot: number | null;
  lossesSnapshot: number | null;
  recordText?: string | null;
  fighter?: {
    recordTotalBouts: number;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
  } | null;
}): string {
  const hasStructuredSnapshot =
    input.totalBoutsSnapshot != null ||
    input.winsSnapshot != null ||
    input.drawsSnapshot != null ||
    input.lossesSnapshot != null;

  if (hasStructuredSnapshot) {
    const wins = input.winsSnapshot;
    const draws = input.drawsSnapshot;
    const losses = input.lossesSnapshot;
    const totalBouts =
      input.totalBoutsSnapshot ??
      (wins != null && draws != null && losses != null
        ? wins + draws + losses
        : null);
    return formatAutoMatchRecordText({
      totalBouts,
      wins,
      draws,
      losses,
    });
  }

  const fighter = input.fighter;
  if (
    fighter &&
    (fighter.recordTotalBouts > 0 ||
      fighter.recordWin > 0 ||
      fighter.recordLoss > 0 ||
      fighter.recordDraw > 0)
  ) {
    return formatAutoMatchRecordText({
      totalBouts:
        fighter.recordTotalBouts ||
        fighter.recordWin + fighter.recordLoss + fighter.recordDraw,
      wins: fighter.recordWin,
      draws: fighter.recordDraw,
      losses: fighter.recordLoss,
    });
  }

  const freeText = input.recordText?.trim();
  if (freeText) return freeText;
  return "전적 정보 없음";
}
