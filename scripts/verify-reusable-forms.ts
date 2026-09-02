/**
 * Intake form domain static checks
 *   npx tsx scripts/verify-reusable-forms.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const serviceSrc = read("src/lib/services/intake-form.service.ts");
const repoSrc = read("src/lib/repositories/intake-form.repository.ts");

assert.doesNotMatch(serviceSrc, /eventApplication\.update/);
assert.doesNotMatch(serviceSrc, /bracketMatch\.update/);
assert.match(serviceSrc, /fieldLabelSnapshot/);
assert.match(serviceSrc, /generateIntakeFormPublicToken/);
assert.match(serviceSrc, /intake_form_duplicated/);
assert.doesNotMatch(repoSrc, /submissions.*copy/i);

const fieldsSrc = read("src/lib/intake-form/fields.ts");
assert.match(fieldsSrc, /isDestructiveIntakeFieldTypeChange/);
assert.match(fieldsSrc, /validateIntakeFormAnswers/);

const noticeSrc = read("prisma/schema.prisma");
assert.match(noticeSrc, /relatedFormId\s+String\?/);
assert.match(noticeSrc, /ScheduleRelatedForm/);
assert.doesNotMatch(noticeSrc, /IntakeForm.*noticeId.*required/i);

console.log("verify-reusable-forms: OK");
