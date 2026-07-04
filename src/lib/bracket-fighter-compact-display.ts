import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";

export type BracketFighterPlacementMeta = {
  matchLabel: string;
  corner: "홍코너" | "청코너";
  opponentName: string;
};

export type BracketCandidateGroup = "assigned" | "unassignable" | "unassigned";

/** 긴 assignability 경고 문장을 한 줄로 요약한다. */
export function summarizeAssignabilityWarningLine(
  warningReason?: string | null,
): string | undefined {
  if (!warningReason?.trim()) return undefined;
  const text = warningReason.trim();
  const hasCheckIn = text.includes("현장");
  const hasWeighIn = text.includes("계체");
  if (hasCheckIn && hasWeighIn) return "현장/계체 미완료";
  if (hasCheckIn) return "현장 미확인";
  if (hasWeighIn) return "계체 미완료";
  const firstSentence = text.split(/[.!?\n]/)[0]?.trim();
  return firstSentence || text;
}

export function buildCandidateMetaLine(
  group: BracketCandidateGroup,
  placement: BracketFighterPlacementMeta | undefined,
  isPlaced: boolean,
): string | undefined {
  if (group === "assigned" && placement) {
    return `${placement.matchLabel} 배정 · ${placement.corner}`;
  }
  if (group === "unassignable") {
    if (isPlaced && placement) {
      return `${placement.matchLabel} 배정 · 교체 필요`;
    }
    return undefined;
  }
  if (group === "unassigned") {
    return "대진 대기";
  }
  return undefined;
}

export function resolveCandidateStatusBadge(option: {
  isAssignableForBracket: boolean;
  assignabilityLabel: string;
  assignabilityDisabledReason?: string | null;
  assignabilityWarningReason?: string | null;
}): {
  label: string;
  variant: "default" | "warning" | "destructive";
  title?: string;
} {
  if (!option.isAssignableForBracket) {
    return {
      label: option.assignabilityLabel,
      variant: "destructive",
      title: option.assignabilityDisabledReason ?? undefined,
    };
  }
  if (
    option.assignabilityWarningReason &&
    option.assignabilityLabel !== "대진 가능"
  ) {
    return {
      label: option.assignabilityLabel,
      variant: "warning",
      title: option.assignabilityWarningReason,
    };
  }
  if (option.assignabilityLabel !== "대진 가능") {
    return {
      label: option.assignabilityLabel,
      variant: "warning",
      title: option.assignabilityWarningReason ?? undefined,
    };
  }
  return {
    label: option.assignabilityLabel,
    variant: "default",
  };
}

export function resolveSlotFighterDisplay(option: OrganizerApprovedFighterOptionVM): {
  fighterName: string;
  gymName: string;
  statusBadge: ReturnType<typeof resolveCandidateStatusBadge>;
  metaLine?: string;
} {
  const statusBadge = resolveCandidateStatusBadge(option);
  let metaLine: string | undefined;
  if (option.isAssignableForBracket) {
    const summarized = summarizeAssignabilityWarningLine(
      option.assignabilityWarningReason,
    );
    if (summarized && summarized !== statusBadge.label) {
      metaLine = summarized;
    }
  }

  return {
    fighterName: option.fighterName,
    gymName: option.gymName,
    statusBadge,
    metaLine,
  };
}
