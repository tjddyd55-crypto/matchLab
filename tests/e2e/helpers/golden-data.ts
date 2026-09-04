import { readFileSync } from "node:fs";
import {
  GOLDEN_CONTEXT_PATH,
  type GoldenFlowContext,
} from "../../../scripts/golden/constants";

export type { GoldenFlowContext };

export function loadGoldenFlowContext(): GoldenFlowContext {
  const raw = readFileSync(GOLDEN_CONTEXT_PATH, "utf8");
  return JSON.parse(raw) as GoldenFlowContext;
}

export function goldenContextExists(): boolean {
  try {
    readFileSync(GOLDEN_CONTEXT_PATH, "utf8");
    return true;
  } catch {
    return false;
  }
}
