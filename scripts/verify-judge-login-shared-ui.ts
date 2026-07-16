/**
 * /judge/login 과 AuthLogin SSOT 공유 검증
 *   npm run verify:judge-login-shared-ui
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const judgePage = read("src/app/(judge)/judge/login/page.tsx");
  const judgeForm = read("src/components/domain/judges/JudgeLoginForm.tsx");
  const shell = read("src/components/domain/auth/AuthLoginShell.tsx");
  const form = read("src/components/domain/auth/AuthLoginForm.tsx");
  const judgeLayout = read("src/app/(judge)/layout.tsx");
  const workspaceLayout = read(
    "src/app/(judge)/judge/(workspace)/layout.tsx",
  );
  const judgeActions = read("src/features/judge/actions.ts");

  assert.ok(judgePage.includes("AuthLoginShell"));
  assert.ok(judgePage.includes("JudgeLoginForm"));
  assert.ok(judgePage.includes("AuthLoginNoticeList"));
  assert.ok(judgePage.includes("심판 전용 로그인"));
  assert.ok(judgeForm.includes("AuthLoginForm"));
  assert.ok(judgeForm.includes("judgeLoginAction"));
  assert.ok(judgeForm.includes('identifierName="loginId"'));
  assert.ok(shell.includes("MatchonLogo"));
  assert.ok(form.includes("AuthLoginField"));
  assert.ok(judgeActions.includes("export async function judgeLoginAction"));
  // 로그인 화면에 global header 혼용 금지
  assert.equal(judgeLayout.includes("MatchonLogo"), false);
  assert.ok(workspaceLayout.includes("MatchonLogo"));
  // 중복 field markup 금지
  assert.equal(judgeForm.includes("<input"), false);
  assert.equal(judgeForm.includes("judgeFieldInputClass"), false);

  console.log("verify:judge-login-shared-ui: OK");
}

main();
