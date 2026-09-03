/**
 * Template apply plan SSOT — Application 재분류 없음
 *   npm run verify:event-division-rebuild
 *   npm run verify:event-division-template-application-ssot
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { planTemplateDivisionApply } from "../src/lib/services/event-division-template-apply-plan";
import type { EventDivisionFromTemplateRow } from "../src/lib/division-template/division-template-row";

function row(
  partial: Partial<EventDivisionFromTemplateRow> & {
    ageGroup: string;
    weightClass: string;
  },
): EventDivisionFromTemplateRow {
  return {
    sportType: "킥복싱",
    ruleType: null,
    gender: "male",
    ageGroup: partial.ageGroup,
    weightClass: partial.weightClass,
    weightClassName: partial.weightClassName ?? null,
    weightLimitText: partial.weightLimitText ?? null,
    skillLevel: null,
  };
}

function main() {
  const high55 = row({
    ageGroup: "고등부",
    weightClass: "라이트급 -55kg",
    weightClassName: "라이트급",
    weightLimitText: "-55kg",
  });
  const high60 = row({
    ageGroup: "고등부",
    weightClass: "웰터급 -60kg",
    weightClassName: "웰터급",
    weightLimitText: "-60kg",
  });
  const middle50 = row({
    ageGroup: "중등부",
    weightClass: "밴텀급 -50kg",
    weightClassName: "밴텀급",
    weightLimitText: "-50kg",
  });

  // Case A: same semantic → KEEP
  const same = planTemplateDivisionApply({
    existing: [
      {
        id: "d1",
        ...high55,
        applicantCount: 3,
      },
    ],
    templateRows: [high55],
  });
  assert.equal(same.keep.length, 1);
  assert.equal(same.created.length, 0);
  assert.equal(same.removed.length, 0);
  assert.equal(same.blockedByRemovedApplicants, false);
  assert.equal(same.keep[0]?.existingDivisionId, "d1");

  // Case B: add division → NEW + KEEP
  const add = planTemplateDivisionApply({
    existing: [{ id: "d1", ...high55, applicantCount: 2 }],
    templateRows: [high55, high60],
  });
  assert.equal(add.keep.length, 1);
  assert.equal(add.created.length, 1);
  assert.equal(add.removed.length, 0);

  // Case C: remove used division → block
  const removeUsed = planTemplateDivisionApply({
    existing: [{ id: "d1", ...high55, applicantCount: 3 }],
    templateRows: [high60],
  });
  assert.equal(removeUsed.removed.length, 1);
  assert.equal(removeUsed.removedWithApplicants.length, 1);
  assert.equal(removeUsed.removedApplicantTotal, 3);
  assert.equal(removeUsed.blockedByRemovedApplicants, true);
  assert.equal(removeUsed.created.length, 1);

  // Case D: remove unused → allow remove
  const removeUnused = planTemplateDivisionApply({
    existing: [
      { id: "d1", ...high55, applicantCount: 1 },
      { id: "d2", ...middle50, applicantCount: 0 },
    ],
    templateRows: [high55],
  });
  assert.equal(removeUnused.keep.length, 1);
  assert.equal(removeUnused.removed.length, 1);
  assert.equal(removeUnused.removed[0]?.applicantCount, 0);
  assert.equal(removeUnused.blockedByRemovedApplicants, false);

  const service = readFileSync(
    join(process.cwd(), "src/lib/services/event-division-rebuild.service.ts"),
    "utf8",
  );
  assert.doesNotMatch(service, /clearDivisionIdsForEvent/);
  assert.doesNotMatch(service, /planDivisionRebuildAssignments\(/);
  assert.doesNotMatch(
    service,
    /eventApplication\.updateMany[\s\S]{0,80}divisionId/,
  );
  assert.match(service, /applicationMutations: 0/);
  assert.match(service, /blockedByRemovedApplicants/);
  assert.match(service, /planTemplateDivisionApply/);
  assert.match(service, /onDelete=Cascade/);

  const panel = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/division-templates/ApplyDivisionTemplatePanel.tsx",
    ),
    "utf8",
  );
  assert.doesNotMatch(panel, /신청 선수는 새 경기구분 기준으로 다시 배정됩니다/);
  assert.match(panel, /기존 신청 경기구분은 자동 변경하지 않습니다/);
  assert.match(panel, /blockedByRemovedApplicants/);

  console.log("PASS verify-event-division-rebuild");
  console.log("PASS verify-event-division-template-application-ssot");
}

main();
