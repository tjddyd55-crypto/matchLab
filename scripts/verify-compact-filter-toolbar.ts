/**
 * Desktop compact filter toolbar SSOT
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COMPACT_FILTER_ROW_CLASS,
  COMPACT_FILTER_SEARCH_CLASS,
  COMPACT_NUMBER_INPUT_CLASS,
  sanitizePositiveIntInput,
} from "../src/lib/ui/compact-filter-toolbar";

assert.ok(COMPACT_FILTER_ROW_CLASS.includes("md:flex-nowrap"));
assert.ok(COMPACT_FILTER_SEARCH_CLASS.includes("md:w-[220px]"));
assert.ok(COMPACT_NUMBER_INPUT_CLASS.includes("w-12"));
assert.ok(COMPACT_NUMBER_INPUT_CLASS.includes("appearance-none"));
assert.equal(sanitizePositiveIntInput(""), "");
assert.equal(sanitizePositiveIntInput("3"), "3");
assert.equal(sanitizePositiveIntInput("0"), null);
assert.equal(sanitizePositiveIntInput("ab"), null);

const matched = readFileSync(
  join(process.cwd(), "src/components/domain/brackets/MatchedMatchFilterToolbar.tsx"),
  "utf8",
);
assert.ok(matched.includes("COMPACT_FILTER_ROW_CLASS"));
assert.ok(matched.includes('<option value="all">전체</option>'));
assert.ok(!matched.includes("전적 전체"));
assert.ok(matched.includes('type="text"'));
assert.ok(matched.includes('inputMode="numeric"'));
assert.ok(matched.includes("COMPACT_NUMBER_INPUT_CLASS"));
assert.ok(!matched.includes("최대 총전</span>"));

const unmatched = readFileSync(
  join(
    process.cwd(),
    "src/components/domain/brackets/UnmatchedQuickBarFilterToolbar.tsx",
  ),
  "utf8",
);
assert.ok(unmatched.includes("COMPACT_FILTER_ROW_CLASS"));
assert.ok(unmatched.includes('<option value="all">전체</option>'));
assert.ok(!unmatched.includes("전적 전체"));
assert.ok(unmatched.includes("COMPACT_NUMBER_INPUT_CLASS"));
assert.ok(!unmatched.includes("전 이하"));

const view = readFileSync(
  join(process.cwd(), "src/components/domain/brackets/BracketViewFilterToolbar.tsx"),
  "utf8",
);
assert.ok(view.includes("COMPACT_FILTER_ROW_CLASS"));
assert.ok(view.includes('<option value="all">전체</option>'));
assert.ok(!view.includes("전적 전체"));

const applicant = readFileSync(
  join(
    process.cwd(),
    "src/components/domain/shared/CompactApplicantFilterBar.tsx",
  ),
  "utf8",
);
assert.ok(applicant.includes("md:flex-nowrap"));
assert.ok(applicant.includes("md:w-[180px]"));

console.log("verify:compact-filter-toolbar OK");
