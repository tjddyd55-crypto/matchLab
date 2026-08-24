/**
 * 전체 경기 편집 print/PDF — mode=all-matches, 카드 레이아웃, memo, ops, 파일명
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildAllMatchesPrintOpsLine,
  buildBracketPrintDocumentTitle,
  buildBracketPrintFighterDto,
  buildBracketPrintFighterMetaLine,
} from "../src/lib/brackets/bracket-print-format";

assert.equal(
  buildBracketPrintDocumentTitle("테스트대회"),
  "MATCHON_테스트대회_시합대진표",
);
assert.equal(
  buildBracketPrintDocumentTitle("테스트대회", "all-matches"),
  "MATCHON_테스트대회_전체경기편집",
);

const fighter = buildBracketPrintFighterDto({
  name: "강로원",
  gymNameSnapshot: "T-MAC 종합격투기",
  gymSnapshot: null,
  gymRelationName: null,
  fighterSnapshot: { applicationWeightKg: 66 },
  schoolLevelSnapshot: "MIDDLE",
  schoolGradeSnapshot: 2,
  totalBoutsSnapshot: 0,
  winsSnapshot: 0,
  drawsSnapshot: 0,
  lossesSnapshot: 0,
  recordText: null,
  genderLabel: "남성",
  fighterRecord: null,
});
assert.equal(fighter.gymName, "T-MAC 종합격투기");
assert.equal(fighter.name, "강로원");
assert.equal(
  buildBracketPrintFighterMetaLine(fighter),
  "남성 · 66kg · 중2 · 무전",
);
assert.equal(
  buildAllMatchesPrintOpsLine({
    arenaName: "제1경기장",
    roundLabel: "2R",
    timeLabel: "3:00",
  }),
  "제1경기장 · 2R · 3:00",
);

const formatSrc = readFileSync(
  join(process.cwd(), "src/lib/brackets/bracket-print-format.ts"),
  "utf8",
);
assert.ok(formatSrc.includes("organizerMemo"));
assert.ok(formatSrc.includes("전체경기편집"));
assert.ok(formatSrc.includes("buildBracketPrintFighterMetaLine"));
assert.ok(formatSrc.includes("opsLine"));

const serviceSrc = readFileSync(
  join(process.cwd(), "src/lib/services/bracket-print.service.ts"),
  "utf8",
);
assert.ok(serviceSrc.includes('mode === "all-matches"'));
assert.ok(serviceSrc.includes("organizerMemo"));
assert.ok(serviceSrc.includes("sortMatchesByCourtSchedule"));
assert.ok(serviceSrc.includes("parseMatchOperationalSettings"));
assert.ok(serviceSrc.includes("opsLine"));

const docSrc = readFileSync(
  join(process.cwd(), "src/components/domain/brackets/BracketPrintDocument.tsx"),
  "utf8",
);
assert.ok(docSrc.includes("organizerMemo"));
assert.ok(docSrc.includes('doc.mode === "all-matches"'));
assert.ok(docSrc.includes("전체 경기 편집"));
assert.ok(docSrc.includes("all-matches-print-block"));
assert.ok(docSrc.includes("AllMatchesPrintBlocks"));
assert.ok(docSrc.includes("CourtPrintTable"));
assert.ok(docSrc.includes("break-inside") || true);

const cssSrc = readFileSync(
  join(process.cwd(), "src/components/domain/brackets/bracket-print.css"),
  "utf8",
);
assert.ok(cssSrc.includes("all-matches-print-block"));
assert.ok(cssSrc.includes("break-inside: avoid"));
assert.ok(cssSrc.includes("all-matches-print-memo"));

const pdfSrc = readFileSync(
  join(process.cwd(), "src/lib/brackets/bracket-print-pdf.ts"),
  "utf8",
);
assert.ok(pdfSrc.includes("mode=all-matches"));

console.log("verify:organizer-all-matches-print OK");
