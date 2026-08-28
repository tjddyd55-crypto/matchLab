/**
 * Static verify: Desktop fixed canvas scroll shell (Electron only).
 * Maximized UI must grow fluidly above the 1440 baseline (08f851f restore).
 *   npm run verify:desktop-fixed-canvas
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function testDesktopDetectionReuse() {
  const request = read("src/lib/desktop/request.ts");
  assert.match(request, /isMatchonDesktopRequest/, "server desktop detection");
  assert.match(read("src/lib/desktop/client.ts"), /isMatchonDesktopClient/, "client bridge");
  assert.doesNotMatch(
    read("src/components/layout/AppShell.tsx"),
    /userAgent|navigator\.userAgent/,
    "no ad-hoc UA sniff in shell",
  );
}

function testScrollShell() {
  const globals = read("src/app/globals.css");
  assert.match(globals, /--desktop-layout-base-width:\s*1440px/, "baseline floor 1440");
  assert.match(globals, /--desktop-main-min-width:\s*1216px/, "main min 1216");
  assert.match(globals, /--desktop-content-min-width:\s*984px/, "content min 984");
  assert.doesNotMatch(globals, /--desktop-workspace-width:\s*1080px/, "no compact workspace cap");
  assert.doesNotMatch(globals, /--desktop-matched-panel-width:\s*640px/, "no compact matched cap");
  assert.doesNotMatch(globals, /--desktop-unmatched-panel-width:\s*420px/, "no compact unmatched cap");
  assert.match(globals, /html\.desktop-app \.desktop-app-viewport/, "viewport scroll owner");
  assert.match(globals, /html\.desktop-app \.desktop-app-canvas/, "canvas under desktop-app");
  assert.match(
    globals,
    /width:\s*max\(100%,\s*var\(--desktop-layout-base-width\)\)/,
    "canvas width never below base",
  );
  assert.match(globals, /overflow-x:\s*auto/, "viewport overflow-x auto");
  assert.match(
    globals,
    /html\.desktop-app \.desktop-app-main[\s\S]*flex:\s*1 0 auto/,
    "main grows on maximize",
  );
  assert.match(globals, /html\.desktop-app \.desktop-app-main-content/, "main content flex column");
  assert.match(globals, /html\.desktop-app \.desktop-static-page-fill/, "static page vertical fill");
  assert.match(globals, /desktop-titlebar-overlay/, "titlebar body offset");

  const appShell = read("src/components/layout/AppShell.tsx");
  assert.match(appShell, /desktopAppViewportClass/, "AppShell viewport");
  assert.match(appShell, /desktopAppCanvasClass/, "AppShell canvas");
  assert.match(appShell, /data-desktop-app-viewport/, "viewport data attr");
  assert.match(appShell, /isMatchonDesktopRequest/, "desktop gate");
}

function testDashboardDesktopLayout() {
  const shell = read("src/components/layout/DashboardShell.tsx");
  assert.match(shell, /canvasScroll=\{isDesktop\}/, "sidebar canvas mode");
  assert.match(shell, /flex-row flex-nowrap/, "desktop row layout");
  assert.match(shell, /desktop:hidden/, "hide mobile bottom nav");
  assert.match(shell, /desktopAppShellRootClass/, "shell fills canvas height");
  assert.match(shell, /desktopAppMainContentClass/, "main content stretch");

  const header = read("src/components/layout/Header.tsx");
  assert.match(header, /!isDesktop && props\.role === "organizer"/, "no mobile sheet on desktop");

  const sidebarUi = read("src/lib/ui/dashboard-sidebar-ui.ts");
  assert.match(sidebarUi, /dashboardSidebarAsideCanvasClass/, "in-flow sidebar");
  assert.match(sidebarUi, /shrink-0/, "sidebar no shrink");
  const canvasAside = sidebarUi.split("dashboardSidebarAsideCanvasClass")[1]!.slice(0, 500);
  assert.doesNotMatch(canvasAside, /sticky/, "canvas sidebar not sticky");

  const sidebarShell = read("src/components/layout/dashboard-sidebar/SidebarShell.tsx");
  assert.match(sidebarShell, /canvasScroll/, "canvas scroll branch");
}

function testResponsiveOverrideScope() {
  const globals = read("src/app/globals.css");
  assert.match(globals, /@custom-variant desktop \(html\.desktop-app &\)/, "desktop variant");

  const workspace = read(
    "src/components/domain/brackets/OrganizerAllMatchesWorkspaceClient.tsx",
  );
  assert.match(workspace, /desktopWorkspaceGridClass/, "workspace desktop grid");
  assert.match(
    workspace,
    /desktop:grid-cols-\[minmax\(0,1\.6fr\)_minmax\(0,1\.15fr\)\]/,
    "fluid desktop workspace columns",
  );
  assert.doesNotMatch(workspace, /desktop:w-\[var\(--desktop-workspace-width\)\]/);

  const eventUi = read("src/lib/ui/event-management-ui.ts");
  assert.match(
    eventUi,
    /desktop:min-w-\[var\(--desktop-main-min-width\)\]/,
    "event layout desktop min",
  );
  assert.match(
    eventUi,
    /minmax\(var\(--desktop-content-min-width\),1fr\)/,
    "event content fluid 1fr",
  );
  assert.match(eventUi, /desktop:hidden/, "hide event mobile bar");
}

function testElectronMinSizePolicy() {
  const main = read("desktop/electron/main.ts");
  assert.match(main, /minWidth:\s*800/, "allows smaller window");
  assert.match(main, /minHeight:\s*600/, "allows smaller window height");
  assert.doesNotMatch(main, /minWidth:\s*1100/, "no 1100 min width lock");

  const windowState = read("desktop/electron/window-state.ts");
  assert.match(windowState, /Math\.max\(800/, "state restore min width");
  assert.match(windowState, /Math\.max\(600/, "state restore min height");
}

function testWebResponsivePreserved() {
  const dashboard = read("src/components/layout/DashboardShell.tsx");
  assert.match(dashboard, /md:flex-row/, "web md breakpoint kept");
  assert.match(dashboard, /hidden md:flex/, "web sidebar responsive");
}

function testNoRootFontShrink() {
  const globals = read("src/app/globals.css");
  assert.match(globals, /html\s*\{[\s\S]*font-size:\s*16px/, "root font 16px");
  assert.doesNotMatch(
    globals,
    /html\.desktop-app\s*\{[^}]*font-size:\s*(?!16px)/,
    "desktop must not shrink root font",
  );
}

function main() {
  testDesktopDetectionReuse();
  testScrollShell();
  testDashboardDesktopLayout();
  testResponsiveOverrideScope();
  testElectronMinSizePolicy();
  testWebResponsivePreserved();
  testNoRootFontShrink();
  console.log("verify:desktop-fixed-canvas OK");
}

main();
