import { join } from "node:path";

/** 반복 실행 시 동일 엔티티를 찾기 위한 마커 */
export const GOLDEN_FLOW_MARKER = "MATCHON_GOLDEN_FLOW";

export const GOLDEN_EVENT_SLUG = "golden-flow-qa";
export const GOLDEN_EVENT_TITLE = `${GOLDEN_FLOW_MARKER} QA`;

export const GOLDEN_FIGHTER_RED_CODE = "FTR-GOLDEN-RED";
export const GOLDEN_FIGHTER_BLUE_CODE = "FTR-GOLDEN-BLUE";
export const GOLDEN_FIGHTER_RED_NAME = `${GOLDEN_FLOW_MARKER} 홍길동`;
export const GOLDEN_FIGHTER_BLUE_NAME = `${GOLDEN_FLOW_MARKER} 김철수`;
export const GOLDEN_GYM_NAME = `${GOLDEN_FLOW_MARKER} 체육관`;

export const GOLDEN_BRACKET_TITLE = `${GOLDEN_FLOW_MARKER} 단판`;

export const GOLDEN_CONTEXT_DIR = join(
  process.cwd(),
  "test-results",
  "golden-flow",
);
export const GOLDEN_CONTEXT_PATH = join(GOLDEN_CONTEXT_DIR, "context.json");

export type GoldenFlowContext = {
  marker: string;
  seededAt: string;
  databaseFingerprint: string;
  organizerLoginId: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  divisionId: string;
  courtId: string;
  bracketId: string;
  matchId: string;
  fighterRed: {
    id: string;
    name: string;
    applicationId: string;
    targetWeightKg: number;
  };
  fighterBlue: {
    id: string;
    name: string;
    applicationId: string;
    targetWeightKg: number;
  };
};
