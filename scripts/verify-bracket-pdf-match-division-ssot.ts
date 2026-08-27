/**
 * Detailed PDF 경기구분 SSOT:
 *   Bracket.divisionId → EventDivision.ageGroup
 *   == workspace formatDivisionMainLabel 첫 세그먼트
 *   == PDF matchDivisionLabel
 *
 * application / fighter ageGroup · competitionCategory 는 PDF division source 금지.
 *
 *   npm run verify:bracket-pdf-match-division-ssot
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatDivisionMainLabel,
  resolvePersistedMatchDivisionLabel,
  toEventDivisionDisplayInput,
} from "../src/lib/event-division-fields";
import {
  buildBracketPrintFighterDto,
  formatCourtPrintFighterMeta,
  formatDetailedPrintFighterMeta,
  resolveBracketPrintFighterMetaLine,
} from "../src/lib/brackets/bracket-print-format";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function testStaticWiring() {
  const service = read("src/lib/services/bracket-print.service.ts");
  assert.match(service, /resolvePersistedMatchDivisionLabel/);
  assert.match(service, /matchDivisionLabel/);
  assert.match(service, /m\.bracket\.division/);
  // application ageGroup / competitionCategory 를 division source로 쓰지 않음
  assert.doesNotMatch(
    service,
    /matchDivisionLabel[\s\S]{0,200}competitionCategory/,
  );
  assert.doesNotMatch(service, /app\.ageGroup/);
  assert.doesNotMatch(service, /fighterSnapshot\.ageGroup/);

  const format = read("src/lib/brackets/bracket-print-format.ts");
  assert.match(format, /matchDivisionLabel/);
  assert.doesNotMatch(
    format,
    /formatDetailedPrintFighterMeta[\s\S]{0,300}ageGroupLabel/,
  );

  const doc = read("src/components/domain/brackets/BracketPrintDocument.tsx");
  assert.match(doc, /match\.matchDivisionLabel/);
  assert.doesNotMatch(doc, /match\.ageGroupLabel/);

  const fields = read("src/lib/event-division-fields.ts");
  assert.match(fields, /resolvePersistedMatchDivisionLabel/);
}

function testPersistedDivisionEqualsWorkspaceAndPdf() {
  // 경기 편집에 저장된 EventDivision (초등부/중등부/고등부)
  const middleDivision = toEventDivisionDisplayInput({
    sportType: "킥복싱",
    ruleType: null,
    gender: "male",
    ageGroup: "중등부",
    weightClass: "68",
    weightClassName: null,
    weightLimitText: null,
    skillLevel: null,
  });
  assert.ok(middleDivision);

  const persisted = resolvePersistedMatchDivisionLabel(middleDivision);
  const workspaceLabel = formatDivisionMainLabel(middleDivision!);
  assert.equal(persisted, "중등부");
  assert.match(workspaceLabel, /^중등부/);

  // 신청자에 open/U16 이 있어도 PDF division source가 아님 — formatter는 match 값만 받음
  const athlete = buildBracketPrintFighterDto({
    name: "강로원",
    gymNameSnapshot: "T-MAC",
    gymSnapshot: null,
    fighterSnapshot: {
      applicationWeightKg: 66,
      // legacy / wrong sources — PDF division에 사용되면 안 됨
      ageGroup: "U16",
      competitionCategory: "open",
    },
    schoolLevelSnapshot: "MIDDLE",
    schoolGradeSnapshot: 2,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "남성",
  });

  const pdfMeta = formatDetailedPrintFighterMeta(athlete, {
    matchDivisionLabel: persisted,
  });
  assert.equal(pdfMeta, "남 · 중등부 · 중2 · 66kg · 무전");
  assert.doesNotMatch(pdfMeta ?? "", /\bopen\b|\bU16\b/);

  // DB == workspace 연령부 == PDF
  assert.equal(persisted, "중등부");
  assert.equal(workspaceLabel.split(" · ")[0], persisted);
  assert.match(pdfMeta ?? "", /중등부/);
}

function testElementaryAndHighSchool() {
  for (const ageGroup of ["초등부", "중등부", "고등부"] as const) {
    const div = toEventDivisionDisplayInput({
      sportType: "킥복싱",
      ruleType: null,
      gender: "male",
      ageGroup,
      weightClass: null,
      skillLevel: null,
    });
    const label = resolvePersistedMatchDivisionLabel(div);
    assert.equal(label, ageGroup);
    const f = buildBracketPrintFighterDto({
      name: "A",
      gymNameSnapshot: "G",
      gymSnapshot: null,
      fighterSnapshot: { applicationWeightKg: 50, ageGroup: "open" },
      schoolLevelSnapshot: "MIDDLE",
      schoolGradeSnapshot: 1,
      totalBoutsSnapshot: 0,
      winsSnapshot: 0,
      drawsSnapshot: 0,
      lossesSnapshot: 0,
      genderLabel: "남성",
    });
    const meta = formatDetailedPrintFighterMeta(f, {
      matchDivisionLabel: label,
    });
    assert.match(meta ?? "", new RegExp(ageGroup));
    assert.doesNotMatch(meta ?? "", /\bopen\b/);
  }
}

function testCourtIgnoresMatchDivision() {
  const f = buildBracketPrintFighterDto({
    name: "한현준",
    gymNameSnapshot: "산본더원",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 71 },
    schoolLevelSnapshot: "MIDDLE",
    schoolGradeSnapshot: 3,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "남성",
  });
  assert.equal(formatCourtPrintFighterMeta(f), "남 · 무전");
  assert.equal(
    resolveBracketPrintFighterMetaLine({
      fighter: f,
      mode: "court",
      matchDivisionLabel: "중등부",
    }),
    "남 · 무전",
  );
}

function testEmptyDivisionNoOpenFallback() {
  const empty = toEventDivisionDisplayInput({
    sportType: "킥복싱",
    ruleType: null,
    gender: "male",
    ageGroup: null,
    weightClass: "60",
    skillLevel: null,
  });
  assert.equal(resolvePersistedMatchDivisionLabel(empty), null);
  const f = buildBracketPrintFighterDto({
    name: "B",
    gymNameSnapshot: "G",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 60, ageGroup: "U16" },
    schoolLevelSnapshot: null,
    schoolGradeSnapshot: null,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "남성",
  });
  const meta = formatDetailedPrintFighterMeta(f, {
    matchDivisionLabel: resolvePersistedMatchDivisionLabel(empty),
  });
  assert.equal(meta, "남 · 60kg · 무전");
  assert.doesNotMatch(meta ?? "", /\bU16\b|\bopen\b/);
}

function main() {
  testStaticWiring();
  testPersistedDivisionEqualsWorkspaceAndPdf();
  testElementaryAndHighSchool();
  testCourtIgnoresMatchDivision();
  testEmptyDivisionNoOpenFallback();
  console.log("verify:bracket-pdf-match-division-ssot OK");
}

main();
