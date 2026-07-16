/**
 * 공개 회원가입 허브·체육관 진입 검증.
 *   npm run verify:public-signup-entry
 *
 * 협회 가입(/join/association)은 계정 활성화 완성 전까지 허브에 노출하지 않는다.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  assert.ok(existsSync(join(root, "src/app/(public)/join/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/(public)/join/gym/page.tsx")));

  const hub = read("src/app/(public)/join/page.tsx");
  assert.ok(hub.includes("체육관 가입"));
  assert.ok(hub.includes("/join/gym"));
  assert.equal(hub.includes('href="/join/association"'), false);
  assert.equal(hub.includes(">협회 가입"), false);

  const gym = read("src/app/(public)/join/gym/page.tsx");
  assert.ok(gym.includes("listJoinableAssociations"));
  assert.ok(gym.includes("registerPath"));
  assert.equal(gym.includes("redirect("), false);

  const joinSvc = read("src/lib/services/public-join.service.ts");
  assert.ok(joinSvc.includes("member-gym-register"));
  assert.ok(joinSvc.includes("buildStableMemberGymJoinToken"));

  const register = read("src/app/(auth)/register/page.tsx");
  assert.ok(register.includes('redirect("/join")'));

  const memberGym = read(
    "src/app/(public)/member-gym-register/[token]/page.tsx",
  );
  assert.ok(memberGym.length > 0, "existing member-gym register must remain");

  console.log("verify:public-signup-entry: OK");
}

main();
