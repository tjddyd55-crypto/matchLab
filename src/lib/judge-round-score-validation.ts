export type JudgeRoundScoreInput = {
  roundNumber: number;
  redScore: number | null;
  blueScore: number | null;
};

export function isJudgeRoundBlank(round: JudgeRoundScoreInput): boolean {
  return round.redScore == null && round.blueScore == null;
}

export function isJudgeRoundComplete(round: JudgeRoundScoreInput): boolean {
  return round.redScore != null && round.blueScore != null;
}

export function isJudgeRoundHalfFilled(round: JudgeRoundScoreInput): boolean {
  const hasRed = round.redScore != null;
  const hasBlue = round.blueScore != null;
  return hasRed !== hasBlue;
}

export function isJudgeAllRoundsBlank(rounds: JudgeRoundScoreInput[]): boolean {
  return rounds.every(isJudgeRoundBlank);
}

export function hasAnyCompleteJudgeRound(
  rounds: JudgeRoundScoreInput[],
): boolean {
  return rounds.some(isJudgeRoundComplete);
}

/** 반쪽만 채워진 라운드가 있으면 에러 메시지 반환 */
export function validateJudgeRounds(
  rounds: JudgeRoundScoreInput[],
  judgeOrder?: number,
): string | null {
  for (const round of rounds) {
    if (isJudgeRoundHalfFilled(round)) {
      if (judgeOrder && judgeOrder > 0) {
        return `채점심판 ${judgeOrder}: ${round.roundNumber}라운드 홍/청 점수를 모두 입력해 주세요.`;
      }
      return `${round.roundNumber}라운드 홍/청 점수를 모두 입력해 주세요.`;
    }
  }
  return null;
}

export function sumCompleteJudgeRounds(
  rounds: JudgeRoundScoreInput[],
): { redTotal: number; blueTotal: number; completeRoundCount: number } | null {
  let redTotal = 0;
  let blueTotal = 0;
  let completeRoundCount = 0;

  for (const round of rounds) {
    if (!isJudgeRoundComplete(round)) continue;
    redTotal += round.redScore!;
    blueTotal += round.blueScore!;
    completeRoundCount += 1;
  }

  if (completeRoundCount === 0) return null;
  return { redTotal, blueTotal, completeRoundCount };
}
