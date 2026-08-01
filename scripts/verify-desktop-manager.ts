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
  assertIncludes(pkg, '"version": "1.0.3"', "desktop version SSOT");
  assertIncludes(rootPkg, "desktop:dev", "root scripts");
  assertIncludes(rootPkg, "desktop:build", "root scripts");
  assertIncludes(rootPkg, "desktop:package", "root scripts");
  assertIncludes(rootPkg, "desktop:icons", "root scripts");
  console.log("verify:desktop-environment: OK");
}

function verifyDesktopWebUpdateVersion() {
  const route = read("src/app/api/desktop/version/route.ts");
  const lib = read("src/lib/desktop/web-version.ts");
  assertIncludes(route, "Cache-Control", "no-store header");
  assertIncludes(route, "no-store", "no-store");
  assertIncludes(lib, "webVersion", "webVersion field");
  assertIncludes(lib, "desktopMinimumVersion", "min desktop");
  assertIncludes(lib, "RAILWAY_GIT_COMMIT_SHA", "commit env");
  assertIncludes(lib, "NEXT_PUBLIC_BUILD_ID", "build id fallback");
  assertNotIncludes(lib, "DATABASE_URL", "no db secret");
  assertNotIncludes(lib, "SUPABASE_SERVICE_ROLE", "no supabase secret");
  assertNotIncludes(lib, "environment:", "no env field in payload");
  assertNotIncludes(route, "process.env", "route uses helper only");
  console.log("verify:desktop-web-update-version: OK");
}

function verifyDesktopWebUpdateReload() {
  const autoUpdate = read("desktop/electron/auto-update.ts");
  const store = read("desktop/electron/web-version-store.ts");
  assertIncludes(autoUpdate, "applyWebUpdateNow", "apply web");
  assertIncludes(autoUpdate, "webContents.reload", "reload");
  assertIncludes(store, "desktop-web-version.json", "store filename");
  assertNotIncludes(store, "password", "no password");
  assertNotIncludes(store, "cookie", "no cookie");
  assertNotIncludes(store, "sessionToken", "no session token");
  // applyWebUpdate must not call quitAndInstall
  const applyIdx = autoUpdate.indexOf("export async function applyWebUpdateNow");
  const installIdx = autoUpdate.indexOf("export function installDesktopUpdateNow");
  assert.ok(applyIdx >= 0 && installIdx > applyIdx, "apply before install");
  const applyBody = autoUpdate.slice(applyIdx, installIdx);
  assert.equal(
    applyBody.includes("quitAndInstall"),
    false,
    "web apply must not quitAndInstall",
  );
  assertIncludes(autoUpdate, "lastAutoReloadedVersion", "loop guard memory");
  assertIncludes(autoUpdate, "startupWebReloadDone", "startup once guard");
  console.log("verify:desktop-web-update-reload: OK");
}

function verifyDesktopUpdateChannelSeparation() {
  const autoUpdate = read("desktop/electron/auto-update.ts");
  const display = read("src/lib/desktop/update-display.ts");
  const types = read("src/types/matchon-desktop.d.ts");
  assertIncludes(autoUpdate, "native:", "native channel");
  assertIncludes(autoUpdate, "web:", "web channel");
  assertIncludes(types, "native:", "types native");
  assertIncludes(types, "web:", "types web");
  assertIncludes(display, "install_native", "native priority");
  assertIncludes(display, "apply_web", "web priority");
  assertIncludes(autoUpdate, "quitAndInstall(true, true)", "native restart");
  console.log("verify:desktop-update-channel-separation: OK");
}

function verifyDesktopWebUpdateSession() {
  const main = read("desktop/electron/main.ts");
  const config = read("desktop/electron/config.ts");
  assertIncludes(config, "persist:matchon-manager", "partition");
  assertIncludes(main, "SESSION_PARTITION", "main partition");
  assert.equal(
    main.includes("clearStorageData"),
    false,
    "must not clear session on update",
  );
  assert.equal(
    main.includes("clearCache"),
    false,
    "must not clear cache wholesale",
  );
  console.log("verify:desktop-web-update-session: OK");
}

function verifyDesktopNativeUpdateRestart() {
  const autoUpdate = read("desktop/electron/auto-update.ts");
  assertIncludes(autoUpdate, "installDesktopUpdateNow", "native install fn");
  assertIncludes(autoUpdate, "native.status !== \"ready\"", "ready guard");
  assertIncludes(autoUpdate, "quitAndInstall(true, true)", "silent restart");
  console.log("verify:desktop-native-update-restart: OK");
}

function verifyDesktopUpdatePreloadMinimal() {
  const preload = read("desktop/electron/preload.ts");
  assertIncludes(preload, "applyWebUpdate", "web apply api");
  assertIncludes(preload, "installDesktopUpdate", "native install api");
  assertIncludes(preload, "checkForUpdates", "check api");
  assertNotIncludes(preload, "process.env", "no env");
  assertNotIncludes(preload, "MATCHON_DESKTOP_UPDATE_FEED_URL", "no feed env");
  assertNotIncludes(preload, "shell.openPath", "no shell path");
  assertNotIncludes(preload, "readFileSync", "no fs read");
  console.log("verify:desktop-update-preload-minimal: OK");
}

function packagingPc2() {
  const pkg = JSON.parse(read("desktop/package.json"));
  const main = read("desktop/electron/main.ts");
  const autoUpdate = read("desktop/electron/auto-update.ts");
  const copyStatic = read("desktop/scripts/copy-static.cjs");
  const generateIcons = read("desktop/scripts/generate-icons.mjs");
  const login = read("src/app/desktop/login/page.tsx");
  const preload = read("desktop/electron/preload.ts");
  const header = read("src/components/layout/Header.tsx");
  const desktopForm = read("src/components/domain/desktop/DesktopLoginForm.tsx");

  assert.equal(pkg.build.appId, "com.matchon.manager");
  assert.equal(pkg.build.productName, "MATCHON Manager");
  assertIncludes(JSON.stringify(pkg.build.nsis), "MATCHON-Manager-Setup-", "nsis artifactName");
  assert.equal(pkg.build.nsis.oneClick, false);
  assert.equal(pkg.build.nsis.createDesktopShortcut, true);
  assert.equal(pkg.build.nsis.createStartMenuShortcut, true);
  assert.equal(pkg.build.nsis.runAfterFinish, true);
  assert.equal(pkg.build.nsis.deleteAppDataOnUninstall, false);
  assert.equal(pkg.build.win.forceCodeSigning, false);
  assertIncludes(pkg.build.win.icon, "assets/icon.ico", "win icon");
  assertIncludes(main, "initAutoUpdate", "main wires auto-update");
  assertIncludes(autoUpdate, "MATCHON_DESKTOP_UPDATE_FEED_URL", "feed url env");
  assertIncludes(autoUpdate, "electron-updater", "updater wired");
  assertIncludes(autoUpdate, "quitAndInstall(true, true)", "silent install path");
  assertIncludes(autoUpdate, "update feed is not configured", "internal feed log");
  assertIncludes(autoUpdate, "message: null", "renderer message always null");
  assert.equal(
    autoUpdate.includes("업데이트 서버(MATCHON_DESKTOP_UPDATE_FEED_URL)"),
    false,
    "must not expose env key in user message",
  );
  assert.equal(
    autoUpdate.includes("MATCHON_DESKTOP_UPDATE_FEED_URL가"),
    false,
    "must not put env key into Korean user copy",
  );
  const updateBtn = read(
    "src/components/domain/desktop/DesktopUpdateStatusButton.tsx",
  );
  const updateDisplay = read("src/lib/desktop/update-display.ts");
  assertIncludes(updateBtn, "getDesktopUpdateDisplayState", "display SSOT");
  assertIncludes(updateDisplay, "최신 버전입니다", "up to date / disabled copy");
  assertIncludes(updateDisplay, "프로그램 업데이트", "native ready copy");
  assertIncludes(updateDisplay, "업데이트", "web available copy");
  assertIncludes(updateDisplay, "다시 확인", "error copy");
  assertIncludes(updateDisplay, "apply_web", "web action");
  assertIncludes(updateDisplay, "install_native", "native action");
  assertIncludes(autoUpdate, "applyWebUpdateNow", "web reload path");
  assertIncludes(autoUpdate, "installDesktopUpdateNow", "native install path");
  assertIncludes(autoUpdate, "webContents.reload", "reload only for web");
  assert.equal(
    (autoUpdate.match(/autoUpdater\.quitAndInstall\(true, true\)/g) ?? []).length,
    1,
    "quitAndInstall only once (native)",
  );
  assertIncludes(preload, "applyWebUpdate", "preload web apply");
  assertIncludes(preload, "installDesktopUpdate", "preload native install");
  assert.equal(
    updateBtn.includes("flex-col items-end"),
    false,
    "header update must stay single-line",
  );
  for (const forbidden of [
    "MATCHON_DESKTOP_UPDATE_FEED_URL",
    "latest.yml",
    "github release",
    "feed url",
    "process.env",
    "stack trace",
  ]) {
    assert.equal(
      updateBtn.toLowerCase().includes(forbidden.toLowerCase()),
      false,
      `button must not include ${forbidden}`,
    );
    assert.equal(
      updateDisplay.toLowerCase().includes(forbidden.toLowerCase()),
      false,
      `display helper must not include ${forbidden}`,
    );
  }
  console.log("verify:desktop-update-safe-message: OK");
  console.log("verify:desktop-update-user-copy: OK");
  console.log("verify:desktop-update-no-env-leak: OK");
  console.log("verify:desktop-update-state-display: OK");
  console.log("verify:desktop-update-channel-separation: OK");
  console.log("verify:desktop-update-copy: OK");
  assertIncludes(preload, "getUpdateStatus", "preload update api");
  assertIncludes(preload, "installUpdate", "preload install api compat");
  assertIncludes(header, "DesktopUpdateStatusButton", "header update button");
  assertIncludes(header, "flex-nowrap", "header desktop single-line");
  console.log("verify:desktop-update-header-layout: OK");
  assertIncludes(login, "DesktopUpdateStatusButton", "login update chrome");
  assertIncludes(login, 'title="MATCHON Manager"', "login brand title");
  assertNotIncludes(login, "관리자 로그인", "login no admin title");
  assertIncludes(desktopForm, "비밀번호 찾기", "password help link");
  assertIncludes(desktopForm, "관리자에게 문의하기", "inquiry link");
  assertNotIncludes(desktopForm, "로그인 세션은 서버에서 유지됩니다", "no session note");
  assertIncludes(copyStatic, "public/icon.png", "copy-static must mention not overwriting");
  assertIncludes(generateIcons, "favicon.svg", "icons from web brand SVG");
  assertIncludes(generateIcons, "16, 24, 32, 48, 64, 128, 256", "multi-size ico");
  assertIncludes(login, "DesktopAppVersionLabel", "login version");
  assert.ok(existsSync(join(root, "desktop/assets/icon.ico")), "icon.ico present");
  assert.ok(existsSync(join(root, "desktop/assets/icon.png")), "icon.png present");
  assert.ok(existsSync(join(root, "desktop/PACKAGING.md")), "packaging docs");
  console.log("verify:desktop-packaging-pc2: OK");
}

function supportInquiryPc3() {
  const schema = read("prisma/schema.prisma");
  const service = read("src/lib/services/desktop-support-inquiry.service.ts");
  const actions = read("src/features/desktop-support-inquiry/actions.ts");
  const adminNav = read("src/lib/navigation/admin-navigation.ts");
  const listPage = read("src/app/(dashboard)/admin/support-inquiries/page.tsx");
  const detailPage = read(
    "src/app/(dashboard)/admin/support-inquiries/[inquiryId]/page.tsx",
  );
  const sql = read(
    "prisma/migrations_manual/20260731_desktop_support_inquiry.sql",
  );

  assertIncludes(schema, "model DesktopSupportInquiry", "schema model");
  assertIncludes(schema, "password_help", "schema category");
  assertIncludes(schema, "DesktopSupportInquiryStatus", "schema status");
  assertIncludes(sql, "CREATE TABLE IF NOT EXISTS \"DesktopSupportInquiry\"", "sql");
  assertNotIncludes(sql, "DROP TABLE", "sql additive");
  assertIncludes(service, "createPublic", "public create");
  assertIncludes(service, "assertAdmin", "admin gate");
  assertIncludes(service, "비밀번호·인증번호·토큰", "no secret paste");
  assertIncludes(service, 'source: "desktop"', "source server-fixed");
  assertIncludes(service, 'status: "open"', "status server-fixed");
  assertIncludes(actions, "createDesktopSupportInquiryAction", "public action");
  assertIncludes(actions, "checkDesktopSupportInquiryRateLimit", "rate limit");
  assertIncludes(actions, "updateDesktopSupportInquiryStatusAction", "admin action");
  assertIncludes(actions, 'actor.role !== "admin"', "admin action role gate");
  assert.ok(
    existsSync(join(root, "src/lib/desktop/support-inquiry-rate-limit.ts")),
    "rate limit module",
  );
  assertIncludes(adminNav, "/admin/support-inquiries", "admin nav");
  assertIncludes(listPage, "Manager 문의", "admin list");
  assertIncludes(detailPage, "AdminSupportInquiryStatusForm", "admin detail");
  console.log("verify:desktop-support-inquiry-pc3: OK");
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
  const versionLabel = read(
    "src/components/domain/desktop/DesktopAppVersionLabel.tsx",
  );

  assertIncludes(header, "공개 홈", "header keeps web public home");
  assertIncludes(header, "!isDesktop", "header hides public home on desktop");
  assertIncludes(header, "DesktopHeaderVersion", "header version badge");
  assertIncludes(shell, "isMatchonDesktopRequest", "shell desktop detect");
  assertIncludes(shell, "async function DashboardShell", "async shell");
  assertIncludes(desktopLogin, "비밀번호 찾기", "password help");
  assertIncludes(desktopLogin, "AuthLoginForm", "desktop form");
  assertIncludes(preparing, "관리자 환경을 준비하고 있습니다", "splash copy");
  assertIncludes(versionLabel, "getAppVersion", "version from preload SSOT");
  assert.ok(existsSync(join(root, "public/favicon.svg")), "brand SVG exists");
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
  "web-update-version": verifyDesktopWebUpdateVersion,
  "web-update-reload": verifyDesktopWebUpdateReload,
  "update-channel-separation": verifyDesktopUpdateChannelSeparation,
  "web-update-session": verifyDesktopWebUpdateSession,
  "native-update-restart": verifyDesktopNativeUpdateRestart,
  "update-preload-minimal": verifyDesktopUpdatePreloadMinimal,
  "packaging-pc2": packagingPc2,
  "support-inquiry-pc3": supportInquiryPc3,
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
