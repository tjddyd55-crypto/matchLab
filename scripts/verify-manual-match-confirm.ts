/**
 * Manual match confirm flow
 *   npm run verify:manual-match-confirm
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildManualMatchConfirmDescription,
  formatManualMatchRecordText,
  formatManualMatchWeightText,
} from "../src/lib/brackets/manual-match-pair";

function main() {
  const panel = readFileSync(
    join(process.cwd(), "src/components/domain/brackets/ManualMatchCreatePanel.tsx"),
    "utf8",
  );

  assert.match(panel, /경기를 생성할까요\?/);
  assert.match(panel, /경기 생성/);
  assert.match(panel, /confirmPairKeyRef/);
  // cancel keeps slots — only clears confirmPairKeyRef
  assert.match(panel, /confirmPairKeyRef\.current = null/);
  assert.equal(panel.includes("window.confirm"), false);
  // create only after confirm
  assert.match(panel, /if \(!ok\)/);
  assert.match(panel, /createManualMatchWithPairAction/);
  assert.match(panel, /buildManualMatchConfirmDescription/);

  assert.equal(formatManualMatchWeightText(71), "71kg");
  assert.equal(formatManualMatchWeightText(null), "체중 정보 없음");
  assert.equal(formatManualMatchRecordText("3전 2승 1패"), "3전2승1패");
  assert.equal(formatManualMatchRecordText(""), "전적 정보 없음");

  const desc = buildManualMatchConfirmDescription({
    red: {
      fighterId: "r1",
      fighterName: "박우진",
      gymName: "T-MAC 종합격투기",
      divisionId: "div-a",
      currentDivisionLabel: "고등부 · 남성",
      applicationWeightKg: 71,
      recordSummary: "3전 2승 1패",
      fighterGender: "male",
    },
    blue: {
      fighterId: "b1",
      fighterName: "정윤찬",
      gymName: "T-MAC 종합격투기",
      divisionId: "div-a",
      currentDivisionLabel: "고등부 · 남성",
      applicationWeightKg: 65,
      recordSummary: "",
      fighterGender: "male",
    },
    targetDivisionLabel: "고등부 · 남성",
    moveFighters: [],
    warnings: [{ label: "동일 체육관" }, { label: "체중 차이 6kg" }],
  });

  assert.match(desc, /T-MAC 종합격투기 · 박우진/);
  assert.match(desc, /71kg · 3전2승1패/);
  assert.match(desc, /65kg · 전적 정보 없음/);
  assert.match(desc, /두 선수로 새 경기를 생성합니다/);
  assert.match(desc, /⚠ 동일 체육관/);
  assert.match(desc, /⚠ 체중 차이 6kg/);

  console.log("verify:manual-match-confirm OK");
}

main();
