/**
 * /login 과 AuthLogin SSOT 공유 검증
 *   npm run verify:auth-login-shared-ui
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const loginPage = read("src/app/(auth)/login/page.tsx");
  const loginForm = read("src/components/domain/auth/LoginForm.tsx");
  const shell = read("src/components/domain/auth/AuthLoginShell.tsx");
  const form = read("src/components/domain/auth/AuthLoginForm.tsx");
  const tokens = read("src/lib/ui/auth-login-ui.ts");
  const authActions = read("src/features/auth/actions.ts");

  assert.ok(loginPage.includes("AuthLoginShell"));
  assert.ok(loginPage.includes("LoginForm"));
  assert.ok(loginForm.includes("AuthLoginForm"));
  assert.ok(loginForm.includes("signInWithPasswordAction"));
  assert.ok(loginForm.includes('identifierName="identifier"'));
  assert.ok(shell.includes("MatchonLogo"));
  assert.ok(shell.includes("AUTH_LOGIN_LOGO_SIZE"));
  assert.ok(form.includes("AuthLoginField"));
  assert.ok(form.includes('size="field"'));
  assert.ok(tokens.includes("max-w-[28rem]"));
  assert.ok(tokens.includes("authLoginInputClass"));
  assert.ok(authActions.includes("export async function signInWithPasswordAction"));
  assert.equal(loginPage.includes("authPageTitleClass"), false);
  assert.equal(loginForm.includes("authFieldInputClass"), false);

  console.log("verify:auth-login-shared-ui: OK");
}

main();
