/**
 * Admin-issued password reset link safety verifies.
 *   npm run verify:admin-password-reset-link
 *   npm run verify:admin-password-reset-permissions
 *   npm run verify:admin-password-reset-token-security
 *   npm run verify:admin-password-reset-session-invalidation
 *   npm run verify:admin-password-reset-desktop-navigation
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  generateAdminPasswordResetToken,
  hashAdminPasswordResetToken,
  buildAdminPasswordResetLinkUrl,
} from "../src/server/admin-password-reset/token";
import { loadMatchonAdminPasswordResetLinkConfig } from "../src/server/admin-password-reset/config";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function main() {
  const token = generateAdminPasswordResetToken();
  assert.ok(token.length >= 32);
  const h1 = hashAdminPasswordResetToken(token);
  const h2 = hashAdminPasswordResetToken(token);
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);
  assert.notEqual(h1, token);

  const url = buildAdminPasswordResetLinkUrl(token);
  assert.match(url, /\/password-reset\/admin-link\?token=/);
  assert.doesNotMatch(url, /service_role|password=/i);

  const cfgDev = loadMatchonAdminPasswordResetLinkConfig({
    NODE_ENV: "development",
    RAILWAY_ENVIRONMENT_NAME: "development",
    MATCHON_ADMIN_PASSWORD_RESET_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(cfgDev.enabled, true);
  assert.ok(cfgDev.ttlMs <= 60 * 60_000);

  const cfgProd = loadMatchonAdminPasswordResetLinkConfig({
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_ADMIN_PASSWORD_RESET_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(cfgProd.enabled, false);

  const cfgProdOn = loadMatchonAdminPasswordResetLinkConfig({
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_ADMIN_PASSWORD_RESET_LINK_ENABLED: "true",
    MATCHON_ADMIN_PASSWORD_RESET_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(cfgProdOn.enabled, true);

  const service = read(
    "src/lib/services/admin-password-reset-link.service.ts",
  );
  assert.match(service, /requireRole\(actor, \[UserRole\.admin\]\)/);
  assert.match(service, /tokenHash/);
  assert.match(service, /AdminPasswordResetLinkStatus\.revoked/);
  assert.match(service, /completePasswordReset/);
  assert.doesNotMatch(service, /console\.log\([^\n]*resetUrl/);
  assert.doesNotMatch(service, /console\.log\([^\n]*rawToken/);
  assert.match(service, /matches\.length|users\.length > 1|users\.length === 0/);

  const complete = read("src/server/auth/complete-password-reset.ts");
  assert.match(complete, /updateUserById/);
  assert.match(complete, /admin_password_update_revokes_sessions/);
  assert.match(complete, /consumeCredential/);

  const phoneSvc = read(
    "src/server/phone-verification/services/matchon-phone-verification.service.ts",
  );
  assert.match(phoneSvc, /completePasswordReset/);

  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model AdminPasswordResetLink/);
  assert.match(schema, /tokenHash/);
  assert.doesNotMatch(
    schema,
    /model AdminPasswordResetLink[\s\S]{0,400}\n\s+token\s+String/,
  );
  assert.match(schema, /admin_password_reset_link_issued/);
  assert.match(schema, /password_reset_by_admin_link_completed/);

  const migration = read(
    "prisma/migrations/20260803140000_admin_password_reset_links/migration.sql",
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS \"AdminPasswordResetLink\"/);
  assert.match(migration, /admin_password_reset_link_issued/);

  const middleware = read("src/middleware.ts");
  assert.match(middleware, /password-reset\/admin-link/);
  assert.match(middleware, /no-store/);
  assert.match(middleware, /no-referrer/);

  const nav = read("src/lib/navigation/admin-navigation.ts");
  assert.match(nav, /\/admin\/password-reset-links/);

  const desktop = read("src/components/domain/desktop/DesktopLoginForm.tsx");
  assert.match(desktop, /href="\/password-reset"/);

  const panel = read(
    "src/components/domain/admin/AdminPasswordResetLinkPanel.tsx",
  );
  assert.match(panel, /비밀번호 재설정 링크를 발급할까요/);
  assert.match(panel, /링크 복사/);

  const userForm = read(
    "src/components/domain/auth/AdminPasswordResetUserForm.tsx",
  );
  assert.match(userForm, /history\.replaceState/);
  assert.match(userForm, /비밀번호 변경/);

  const envExample = read(".env.example");
  assert.match(envExample, /MATCHON_ADMIN_PASSWORD_RESET_LINK_ENABLED/);

  console.log("verify:admin-password-reset-link ALL_PASS");
}

main();
