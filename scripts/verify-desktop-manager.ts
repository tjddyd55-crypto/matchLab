/**
 * MATCHON Manager (Stage PC-1) static contract verify
 *   npm run verify:desktop-manager
 *   npm run verify:desktop-entry-routes
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertIncludes(hay: string, needle: string, label: string) {
  assert.ok(hay.includes(needle), `${label}: missing ${JSON.stringify(needle)}`);
}

function assertNotIncludes(hay: string, needle: string, label: string) {
  assert.equal(hay.includes(needle), false, `${label}: must not include ${JSON.stringify(needle)}`);
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === "dist" || name.name === "release") {
        continue;
      }
      walkFiles(p, acc);
    } else {
      acc.push(p);
    }
  }
  return acc;
}

function entryRoutes() {
  assert.ok(existsSync(join(root, "src/app/desktop/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/desktop/login/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/desktop/launch/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/desktop/unavailable/page.tsx")));

  const entry = read("src/app/desktop/page.tsx");
  const login = read("src/app/desktop/login/page.tsx");
  const launch = read("src/app/desktop/launch/page.tsx");
  const constants = read("src/lib/desktop/constants.ts");

  assertIncludes(constants, 'DESKTOP_ENTRY_PATH = "/desktop"', "constants");
  assertIncludes(constants, 'DESKTOP_LOGIN_PATH = "/desktop/login"', "constants");
  assertIncludes(constants, 'DESKTOP_LAUNCH_PATH = "/desktop/launch"', "constants");
  assertIncludes(entry, "DESKTOP_LOGIN_PATH", "entry");
  assertIncludes(entry, "DESKTOP_LAUNCH_PATH", "entry");
  assertIncludes(login, "DesktopLoginForm", "login");
  assertIncludes(login, "logoHref={null}", "login");
  assertIncludes(launch, "resolveDesktopDestination", "launch");
  assertNotIncludes(login, "href=\"/\"", "login must not push public home as primary CTA");
  console.log("verify:desktop-entry-routes: OK");
}

function roleDestination() {
  const dest = read("src/lib/desktop/role-destination.ts");
  const roles = read("src/lib/desktop/manager-roles.ts");
  const actor = read("src/lib/auth/actor.ts");

  assertIncludes(roles, '"organizer"', "roles");
  assertIncludes(roles, '"gym"', "roles");
  assertIncludes(roles, '"gym_staff"', "roles");
  assertIncludes(roles, '"admin"', "roles");
  assertIncludes(dest, "dashboardPathForRole", "destination reuses SSOT");
  assertIncludes(actor, 'case "organizer"', "actor");
  assertIncludes(actor, 'return "/organizer"', "actor");
  assertIncludes(actor, 'return "/gym"', "actor");
  console.log("verify:desktop-role-destination: OK");
}

function loginReuse() {
  const actions = read("src/features/auth/actions.ts");
  const core = read("src/features/auth/authenticate-password.ts");
  const desktopForm = read("src/components/domain/desktop/DesktopLoginForm.tsx");
  const webForm = read("src/components/domain/auth/LoginForm.tsx");

  assertIncludes(core, "authenticateWithPassword", "core");
  assertIncludes(actions, "signInWithPasswordAction", "actions");
  assertIncludes(actions, "signInWithPasswordDesktopAction", "actions");
  assertIncludes(actions, "authenticateWithPassword", "actions reuse core");
  assertIncludes(desktopForm, "signInWithPasswordDesktopAction", "desktop form");
  assertIncludes(desktopForm, "AuthLoginForm", "desktop form SSOT");
  assertIncludes(webForm, "signInWithPasswordAction", "web form unchanged action");
  assertNotIncludes(desktopForm, "/join", "desktop no signup promo");
  console.log("verify:desktop-login-reuse: OK");
}

function sessionPersistence() {
  const main = read("desktop/electron/main.ts");
  const config = read("desktop/electron/config.ts");
  assertIncludes(config, 'SESSION_PARTITION = "persist:matchon-manager"', "partition");
  assertIncludes(main, "partition: SESSION_PARTITION", "main partition");
  assertNotIncludes(main, "localStorage.setItem", "no local password store");
  assertNotIncludes(main, "password", "main should not handle passwords");
  console.log("verify:desktop-session-persistence: OK");
}

function logout() {
  const actions = read("src/features/auth/actions.ts");
  const header = read("src/components/layout/Header.tsx");
  assertIncludes(actions, "signOutAction", "logout");
  assertIncludes(actions, "DESKTOP_LOGIN_PATH", "desktop logout dest");
  assertIncludes(actions, "isMatchonDesktopRequest", "desktop-aware logout");
  assertIncludes(header, "LogoutButton", "header logout");
  assertIncludes(header, "isDesktop", "header desktop branch");
  console.log("verify:desktop-logout: OK");
}

function webRegression() {
  const loginPage = read("src/app/(auth)/login/page.tsx");
  const loginForm = read("src/components/domain/auth/LoginForm.tsx");
  const actor = read("src/lib/auth/actor.ts");

  assertIncludes(loginPage, "LoginForm", "web login");
  assertIncludes(loginPage, "dashboardPathForRole", "web redirect");
  assertIncludes(loginForm, "signInWithPasswordAction", "web action");
  assertIncludes(actor, 'redirect("/login")', "requireActor still /login");
  assertNotIncludes(loginPage, "DESKTOP_LOGIN_PATH", "web login not forced to desktop");
  console.log("verify:desktop-web-regression: OK");
}

function navigationSecurity() {
  const nav = read("desktop/electron/external-navigation.ts");
  const config = read("desktop/electron/config.ts");
  const security = read("desktop/electron/security.ts");

  assertIncludes(nav, "will-navigate", "nav");
  assertIncludes(nav, "setWindowOpenHandler", "nav");
  assertIncludes(nav, "shell.openExternal", "nav");
  assertIncludes(config, "isAllowedMatchonUrl", "config");
  assertIncludes(config, "getAllowedHosts", "config");
  assertIncludes(security, "isDangerousUrl", "security");
  assertIncludes(security, "javascript:", "security");
  console.log("verify:desktop-navigation-security: OK");
}

function externalLinks() {
  const nav = read("desktop/electron/external-navigation.ts");
  assertIncludes(nav, "openInSystemBrowser", "external");
  assertIncludes(nav, "isExternalUrl", "external");
  console.log("verify:desktop-external-links: OK");
}

function windowSecurity() {
  const main = read("desktop/electron/main.ts");
  const preload = read("desktop/electron/preload.ts");
  const security = read("desktop/electron/security.ts");

  assertIncludes(main, "nodeIntegration: false", "main");
  assertIncludes(main, "contextIsolation: true", "main");
  assertIncludes(main, "sandbox: true", "main");
  assertIncludes(main, "webSecurity: true", "main");
  assertIncludes(security, "nodeIntegration: false", "security helper");
  assertIncludes(preload, "contextBridge.exposeInMainWorld", "preload");
  assertIncludes(preload, "isDesktopApp", "preload");
  assertNotIncludes(preload, "fs.", "preload no fs");
  assertNotIncludes(preload, "child_process", "preload no shell");
  assertNotIncludes(main, "nodeIntegration: true", "main");
  assertNotIncludes(main, "contextIsolation: false", "main");
  assertNotIncludes(main, "webSecurity: false", "main");
  console.log("verify:desktop-window-security: OK");
}

function singleInstance() {
  const main = read("desktop/electron/main.ts");
  assertIncludes(main, "requestSingleInstanceLock", "single");
  assertIncludes(main, "second-instance", "single");
  console.log("verify:desktop-single-instance: OK");
}

function environment() {
  const config = read("desktop/electron/config.ts");
  const pkg = read("desktop/package.json");
  const rootPkg = read("package.json");

  assertIncludes(config, "MATCHON_DESKTOP_BASE_URL", "env");
  assertIncludes(config, "PRODUCTION_HOST", "env");
  assertIncludes(config, "app-production-79ad.up.railway.app", "prod host SSOT");
  assertIncludes(pkg, '"productName": "MATCHON Manager"', "pkg");
  assertIncludes(pkg, "com.matchon.manager", "appId");
  assertIncludes(pkg, "electron-builder", "builder");
  assertIncludes(rootPkg, "desktop:dev", "root scripts");
  assertIncludes(rootPkg, "desktop:build", "root scripts");
  assertIncludes(rootPkg, "desktop:package", "root scripts");
  console.log("verify:desktop-environment: OK");
}

function noSecrets() {
  const files = walkFiles(join(root, "desktop")).filter((f) =>
    /\.(ts|js|cjs|json|html)$/.test(f),
  );
  const banned = [
    "DATABASE_URL=",
    "SUPABASE_SERVICE_ROLE",
    "BEGIN PRIVATE KEY",
    "postgres://",
    "postgresql://",
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const b of banned) {
      assert.equal(
        text.includes(b),
        false,
        `${file} must not contain ${b}`,
      );
    }
  }
  console.log("verify:desktop-no-secrets: OK");
}

function uiContract() {
  const header = read("src/components/layout/Header.tsx");
  const shell = read("src/components/layout/DashboardShell.tsx");
  const desktopLogin = read("src/components/domain/desktop/DesktopLoginForm.tsx");
  const preparing = read("src/components/domain/desktop/DesktopPreparing.tsx");

  assertIncludes(header, "공개 홈", "header keeps web public home");
  assertIncludes(header, "!isDesktop", "header hides public home on desktop");
  assertIncludes(shell, "isMatchonDesktopRequest", "shell desktop detect");
  assertIncludes(shell, "async function DashboardShell", "async shell");
  assertIncludes(desktopLogin, "관리자에게 문의해 주세요", "support copy");
  assertIncludes(desktopLogin, "AuthLoginForm", "desktop form");
  assertIncludes(preparing, "관리자 환경을 준비하고 있습니다", "splash copy");
  assert.ok(existsSync(join(root, "public/icon.png")), "brand icon exists");
  console.log("verify:desktop-ui-contract: OK");
}

const runners: Record<string, () => void> = {
  "entry-routes": entryRoutes,
  "role-destination": roleDestination,
  "login-reuse": loginReuse,
  "session-persistence": sessionPersistence,
  logout,
  "web-regression": webRegression,
  "navigation-security": navigationSecurity,
  "external-links": externalLinks,
  "window-security": windowSecurity,
  "single-instance": singleInstance,
  environment,
  "no-secrets": noSecrets,
  "ui-contract": uiContract,
};

function main() {
  const arg = process.argv[2];
  if (!arg) {
    for (const [name, fn] of Object.entries(runners)) {
      fn();
      void name;
    }
    console.log("verify:desktop-manager: ALL OK");
    return;
  }
  const fn = runners[arg];
  if (!fn) {
    console.error(`Unknown suite: ${arg}`);
    process.exit(1);
  }
  fn();
}

main();
