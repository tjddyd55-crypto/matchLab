/**
 * Association notice access + gym menu wiring.
 *   npm run verify:association-notice-access
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model AssociationNotice/);
  assert.match(schema, /organizerId\s+String/);
  assert.match(schema, /isPinned\s+Boolean/);
  assert.match(schema, /deletedAt\s+DateTime\?/);
  assert.doesNotMatch(schema, /model AssociationNoticeGym/);

  const service = read("src/lib/services/association-notice.service.ts");
  assert.match(service, /requireAssociationOrganizerScope/);
  assert.match(service, /requireGymPortalRead/);
  assert.match(service, /findActiveMembership/);

  const repo = read("src/lib/repositories/association-notice.repository.ts");
  assert.match(repo, /AssociationMemberGymStatus\.active/);
  assert.match(repo, /listActiveAssociationsForGym/);

  const gymPage = read(
    "src/app/(dashboard)/gym/associations/[associationId]/notices/page.tsx",
  );
  assert.doesNotMatch(gymPage, /createAssociationNotice|공지 작성|수정|삭제/);

  const orgPage = read("src/app/(dashboard)/organizer/notices/page.tsx");
  assert.match(orgPage, /공지 작성/);

  console.log("verify:association-notice-access OK");
}

main();
