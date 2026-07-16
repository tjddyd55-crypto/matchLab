/**
 * 공개 홈에 심판 입장 섹션/링크가 없는지 검증.
 *   npm run verify:public-home-no-judge-access
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  assert.equal(
    existsSync(
      join(
        root,
        "src/components/domain/events/public/PublicHomeJudgeSection.tsx",
      ),
    ),
    false,
    "PublicHomeJudgeSection must be removed",
  );

  const home = read("src/app/(public)/page.tsx");
  assert.equal(home.includes("PublicHomeJudgeSection"), false);
  assert.equal(home.includes("/judge/login"), false);

  const nav = read("src/components/layout/PublicNav.tsx");
  assert.equal(nav.includes("/judge/login"), false);
  assert.equal(nav.includes("심판"), false);
  assert.ok(nav.includes('href="/login"'));
  assert.ok(nav.includes('href="/join"'));
  assert.ok(nav.includes("회원가입"));

  const judgeLogin = read("src/app/(judge)/judge/login/page.tsx");
  assert.ok(judgeLogin.length > 0, "judge login route must remain");

  console.log("verify:public-home-no-judge-access: OK");
}

main();
