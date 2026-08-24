/**
 * 전체 경기 편집 print/PDF — mode=all-matches, memo, 파일명, court schedule 정렬
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildBracketPrintDocumentTitle,
} from "../src/lib/brackets/bracket-print-format";

assert.equal(
  buildBracketPrintDocumentTitle("테스트대회"),
  "MATCHON_테스트대회_시합대진표",
);
assert.equal(
  buildBracketPrintDocumentTitle("테스트대회", "all-matches"),
  "MATCHON_테스트대회_전체경기편집",
);

const formatSrc = readFileSync(
  join(process.cwd(), "src/lib/brackets/bracket-print-format.ts"),
  "utf8",
);
assert.ok(formatSrc.includes("organizerMemo"));
assert.ok(formatSrc.includes("전체경기편집"));

const serviceSrc = readFileSync(
  join(process.cwd(), "src/lib/services/bracket-print.service.ts"),
  "utf8",
);
assert.ok(serviceSrc.includes('mode === "all-matches"'));
assert.ok(serviceSrc.includes("organizerMemo"));
assert.ok(serviceSrc.includes("sortMatchesByCourtSchedule"));

const docSrc = readFileSync(
  join(process.cwd(), "src/components/domain/brackets/BracketPrintDocument.tsx"),
  "utf8",
);
assert.ok(docSrc.includes("organizerMemo"));
assert.ok(docSrc.includes('doc.mode === "all-matches"'));
assert.ok(docSrc.includes("전체 경기 편집"));

const pdfSrc = readFileSync(
  join(process.cwd(), "src/lib/brackets/bracket-print-pdf.ts"),
  "utf8",
);
assert.ok(pdfSrc.includes("mode=all-matches"));

const routeSrc = readFileSync(
  join(
    process.cwd(),
    "src/app/api/organizer/events/[eventId]/brackets/print-pdf/route.ts",
  ),
  "utf8",
);
assert.ok(routeSrc.includes("all-matches"));

const actionsSrc = readFileSync(
  join(
    process.cwd(),
    "src/components/domain/brackets/OrganizerBracketPrintActions.tsx",
  ),
  "utf8",
);
assert.ok(actionsSrc.includes("printMode"));
assert.ok(actionsSrc.includes("all-matches"));

console.log("verify:organizer-all-matches-print OK");
