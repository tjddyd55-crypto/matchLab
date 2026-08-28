/**
 * Static SSOT: Electron global title bar back navigation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function managerGlobalBackNavigation() {
  const main = read("desktop/electron/main.ts");
  assert.ok(main.includes("titleBarOverlay"));
  assert.ok(main.includes("titleBarStyle"));
  assert.ok(main.includes("desktop:navigate-back"));
  assert.ok(main.includes("desktop:can-navigate-back"));
  assert.ok(main.includes("desktop:get-titlebar-mode"));

  const preload = read("desktop/electron/preload.ts");
  assert.ok(preload.includes("navigateBack"));
  assert.ok(preload.includes("getTitleBarMode"));
  assert.ok(preload.includes("contextBridge.exposeInMainWorld"));

  const titleBar = read("src/components/domain/desktop/DesktopManagerTitleBar.tsx");
  assert.ok(titleBar.includes("desktop-titlebar-drag"));
  assert.ok(titleBar.includes("desktop-titlebar-no-drag"));
  assert.ok(titleBar.includes("navigateBack"));
  assert.ok(titleBar.includes("managerRoleHomeFromPathname"));
  assert.ok(titleBar.includes('mode !== "overlay"'));

  const layout = read("src/app/layout.tsx");
  assert.ok(layout.includes("DesktopManagerTitleBar"));

  const globals = read("src/app/globals.css");
  assert.ok(globals.includes("desktop-titlebar-overlay"));

  console.log("verify:manager-global-back-navigation: PASS");
}

managerGlobalBackNavigation();
