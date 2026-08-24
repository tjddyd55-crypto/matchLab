/**
 * MATCHON Manager — 미인증 navigation boundary
 *   npm run verify:desktop-auth-boundary
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isDesktopUnauthAllowedPath,
  isMatchonDesktopRequestHeaders,
  resolveDesktopUnauthRedirectPath,
} from "../src/lib/desktop/auth-boundary";
import { DESKTOP_LOGIN_PATH } from "../src/lib/desktop/constants";

const ROOT = process.cwd();
function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

assert.equal(
  isMatchonDesktopRequestHeaders({
    headerValue: "1",
    userAgent: "Mozilla",
  }),
  true,
);
assert.equal(
  isMatchonDesktopRequestHeaders({
    headerValue: null,
    userAgent: "Chrome MATCHON-Manager/1.0.4",
  }),
  true,
);
assert.equal(
  isMatchonDesktopRequestHeaders({
    headerValue: null,
    userAgent: "Mozilla/5.0 Chrome",
  }),
  false,
);

assert.equal(isDesktopUnauthAllowedPath("/desktop/login"), true);
assert.equal(isDesktopUnauthAllowedPath("/desktop"), true);
assert.equal(isDesktopUnauthAllowedPath("/password-reset"), true);
assert.equal(isDesktopUnauthAllowedPath("/password-reset/admin-link"), true);
assert.equal(isDesktopUnauthAllowedPath("/join"), true);
assert.equal(isDesktopUnauthAllowedPath("/joining"), false);
assert.equal(isDesktopUnauthAllowedPath("/api/public/x"), true);
assert.equal(isDesktopUnauthAllowedPath("/api"), true);
assert.equal(isDesktopUnauthAllowedPath("/login"), true);
assert.equal(isDesktopUnauthAllowedPath("/"), false);
assert.equal(isDesktopUnauthAllowedPath("/organizer"), false);
assert.equal(isDesktopUnauthAllowedPath("/events"), false);

assert.equal(resolveDesktopUnauthRedirectPath("/"), DESKTOP_LOGIN_PATH);
assert.equal(resolveDesktopUnauthRedirectPath("/organizer/events"), DESKTOP_LOGIN_PATH);
assert.equal(resolveDesktopUnauthRedirectPath("/desktop/login"), null);

const middleware = read("src/middleware.ts");
assert.ok(middleware.includes("resolveDesktopUnauthRedirectPath"));
assert.ok(middleware.includes("isMatchonDesktopRequestHeaders"));
assert.ok(middleware.includes("DESKTOP_LOGIN_PATH"));

const logout = read("src/components/domain/auth/LogoutButton.tsx");
assert.ok(logout.includes("router.replace"));
assert.ok(!logout.includes("router.push("));
assert.ok(logout.includes("clearNavigationHistory"));

const loginPage = read("src/app/desktop/login/page.tsx");
assert.ok(loginPage.includes("DesktopAuthBoundaryEffect"));

const nav = read("desktop/electron/external-navigation.ts");
assert.ok(nav.includes("clearHistory"));
assert.ok(nav.includes("did-navigate"));
assert.ok(nav.includes("/desktop/login"));

const preload = read("desktop/electron/preload.ts");
assert.ok(preload.includes("clearNavigationHistory"));

const main = read("desktop/electron/main.ts");
assert.ok(main.includes("desktop:clear-navigation-history"));

const webLogin = read("src/app/(auth)/login/page.tsx");
assert.ok(!webLogin.includes("DESKTOP_LOGIN_PATH"));

const pkg = JSON.parse(read("desktop/package.json")) as { version: string };
assert.equal(pkg.version, "1.0.4");

console.log("verify:desktop-auth-boundary OK");
