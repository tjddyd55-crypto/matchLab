/**
 * 대진표 / 미매칭 PDF 배선 + PII 미포함 정적 검증
 *   npm run verify:bracket-unmatched-pdf
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const root = process.cwd();
  const printSvc = readFileSync(
    join(root, "src/lib/services/bracket-print.service.ts"),
    "utf8",
  );
  const pdfLib = readFileSync(
    join(root, "src/lib/brackets/bracket-print-pdf.ts"),
    "utf8",
  );
  const unmatchedPage = readFileSync(
    join(
      root,
      "src/app/(print)/organizer/events/[eventId]/brackets/unmatched-print/page.tsx",
    ),
    "utf8",
  );
  const unmatchedApi = readFileSync(
    join(
      root,
      "src/app/api/organizer/events/[eventId]/brackets/unmatched-print-pdf/route.ts",
    ),
    "utf8",
  );
  const bracketDoc = readFileSync(
    join(root, "src/components/domain/brackets/BracketPrintDocument.tsx"),
    "utf8",
  );
  const format = readFileSync(
    join(root, "src/lib/brackets/bracket-print-format.ts"),
    "utf8",
  );
  const workspace = readFileSync(
    join(
      root,
      "src/components/domain/brackets/OrganizerAllMatchesWorkspaceClient.tsx",
    ),
    "utf8",
  );

  assert.match(printSvc, /getOrganizerUnmatchedPrintDocument/);
  assert.match(printSvc, /eventWideUnmatchedOptions/);
  assert.match(pdfLib, /generateUnmatchedPrintPdfBuffer/);
  assert.match(unmatchedPage, /UnmatchedPrintDocument/);
  assert.match(unmatchedApi, /generateUnmatchedPrintPdfBuffer/);
  assert.match(unmatchedApi, /requireOrganizerForEvent/);
  assert.match(bracketDoc, /ops-print-corner-red/);
  assert.match(bracketDoc, /원본 자료 없음/);
  assert.match(format, /BRACKET_PRINT_MATCHES_PER_PAGE/);
  assert.match(format, /buildUnmatchedPrintDocumentTitle/);
  assert.match(workspace, /OrganizerUnmatchedPrintActions/);
  assert.match(workspace, /미매칭 선수 PDF|OrganizerUnmatchedPrintActions/);

  for (const src of [printSvc, unmatchedPage, unmatchedApi, bracketDoc, format]) {
    assert.doesNotMatch(src, /주민등록|rrn|phoneNumber|birthDate|encrypted/i);
  }

  console.log("verify:bracket-unmatched-pdf OK");
}

main();
