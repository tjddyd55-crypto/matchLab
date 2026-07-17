/**
 * 협회 전용 member-gym join link 회귀 유지.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function main() {
  const tokenPage = join(
    root,
    "src/app/(public)/member-gym-register/[token]/page.tsx",
  );
  assert.ok(existsSync(tokenPage), "member-gym-register route must remain");

  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  assert.ok(schema.includes("model AssociationJoinLink"));
  assert.ok(schema.includes("model AssociationMemberGymApplication"));
  assert.ok(schema.includes("model AssociationMemberGym"));

  const joinGym = readFileSync(
    join(root, "src/app/(public)/join/gym/page.tsx"),
    "utf8",
  );
  assert.ok(
    joinGym.includes("member-gym-register") === false ||
      joinGym.includes("유지"),
  );

  console.log("verify:association-member-gym-link-flow: OK");
}

main();
