/**
 * Static verify: user-facing displayName SSOT.
 *   npx tsx scripts/verify-template-display-name.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { memberSportTemplateDisplayName } from "../src/lib/gym-member-profile/display-name";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const files = [
    "src/app/(onboarding)/join/gym/page.tsx",
    "src/components/domain/gym-members/GymMemberMultiSportSections.tsx",
    "src/components/domain/gym-members/GymMemberProfileSections.tsx",
    "src/components/domain/gym-members/GymMemberProfileDetailSections.tsx",
    "src/components/domain/gym-members/GymSportTemplateSettingsPanel.tsx",
  ];
  for (const f of files) {
    const src = read(f);
    assert.match(
      src,
      /memberSportTemplateDisplayName|displayName/,
      `missing displayName usage: ${f}`,
    );
  }

  // MultiSportSections must not render template.name alone as label
  const multi = read(
    "src/components/domain/gym-members/GymMemberMultiSportSections.tsx",
  );
  assert.doesNotMatch(multi, /\{t\.name\}/);

  const sections = read(
    "src/components/domain/gym-members/GymMemberProfileSections.tsx",
  );
  assert.doesNotMatch(sections, /\$\{template\.name\}/);

  assert.equal(
    memberSportTemplateDisplayName({
      name: "킥복싱 테스트 버전 2",
      displayName: "킥복싱",
    }),
    "킥복싱",
  );

  console.log("verify:template-display-name: ALL OK");
}

main();
