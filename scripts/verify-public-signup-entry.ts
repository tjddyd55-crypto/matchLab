/**
 * 공개 회원가입 허브 검증 (협회·체육관 모두 노출).
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
  assert.ok(
    existsSync(join(root, "src/app/(public)/join/association/page.tsx")),
  );

  const hub = read("src/app/(public)/join/page.tsx");
  assert.ok(hub.includes("체육관 가입"));
  assert.ok(hub.includes("협회 가입"));
  assert.ok(hub.includes("/join/gym"));
  assert.ok(hub.includes("/join/association"));

  const gym = read("src/app/(public)/join/gym/page.tsx");
  assert.equal(gym.includes("redirect("), false);

  const register = read("src/app/(auth)/register/page.tsx");
  assert.ok(register.includes('redirect("/join")'));

  console.log("verify:public-signup-entry: OK");
}

main();
