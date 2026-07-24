/**
 * 독립 체육관 가입 — 협회 선택 없음·GymApplication 경로.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const hub = read("src/app/(public)/join/page.tsx");
  assert.ok(hub.includes("체육관"));
  assert.ok(!hub.includes("회원사로 가입"));
  assert.ok(hub.includes("초대 링크"));
  assert.equal(hub.includes("로그인 후 협회 연결"), false);

  const gym = read("src/app/(public)/join/gym/page.tsx");
  assert.ok(gym.includes("GymJoinApplicationForm"));
  assert.ok(!gym.includes("listJoinableAssociations"));
  assert.ok(!gym.includes("href={a.registerPath}"));
  assert.ok(!gym.includes("가입할 협회"));

  assert.ok(existsSync(join(root, "src/lib/services/gym-application.service.ts")));
  const service = read("src/lib/services/gym-application.service.ts");
  assert.ok(service.includes("associationMemberGymCreated: false"));
  assert.ok(!service.includes("associationMemberGym.create"));

  const schema = read("prisma/schema.prisma");
  assert.ok(schema.includes("model GymApplication"));
  assert.ok(schema.includes("model AssociationGymConnectionRequest"));

  assert.ok(
    existsSync(
      join(root, "src/app/(public)/member-gym-register/[token]/page.tsx"),
    ),
  );

  console.log("verify:public-gym-independent-signup: OK");
}

main();
