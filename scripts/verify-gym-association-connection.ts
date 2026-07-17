/**
 * 체육관→협회 연결 요청 구조 정적 검증.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  assert.ok(existsSync(join(root, "src/app/(dashboard)/gym/associations/page.tsx")));
  assert.ok(
    existsSync(
      join(root, "src/lib/services/association-gym-connection.service.ts"),
    ),
  );
  const service = read(
    "src/lib/services/association-gym-connection.service.ts",
  );
  assert.ok(service.includes("associationMemberGym.create") || service.includes("createMemberGym"));
  assert.ok(service.includes("AssociationGymConnectionRequest"));
  assert.ok(!service.includes("gym.create("));

  const schema = read("prisma/schema.prisma");
  assert.ok(schema.includes("model AssociationGymConnectionRequest"));
  assert.match(schema, /@@unique\(\[organizerId, gymId\]\)/);

  const appsPage = read(
    "src/app/(dashboard)/organizer/member-gyms/applications/page.tsx",
  );
  assert.ok(appsPage.includes("기존 체육관 연결 요청"));
  assert.ok(appsPage.includes("AssociationConnectionRequestsPanel"));

  console.log("verify:gym-association-connection: OK");
}

main();
