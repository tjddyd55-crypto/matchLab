/**
 * Static SSOT: Manager primary/secondary nav stay put; content scrolls.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const globals = read("src/app/globals.css");
assert.match(
  globals,
  /html\.desktop-app \.desktop-app-viewport[\s\S]*overflow-y:\s*hidden/,
  "viewport must not own vertical scroll",
);
assert.match(
  globals,
  /html\.desktop-app \.desktop-app-main-content[\s\S]*overflow-y:\s*auto/,
  "main content owns vertical scroll",
);
assert.match(globals, /desktop-app-event-side-nav/, "event secondary sticky height class");

const sidebar = read("src/lib/ui/dashboard-sidebar-ui.ts");
assert.match(sidebar, /dashboardSidebarAsideCanvasClass[\s\S]*h-full/, "primary fills shell");
assert.doesNotMatch(
  sidebar.split("dashboardSidebarAsideCanvasClass")[1]!.slice(0, 400),
  /min-h-full/,
  "primary must not stretch with page length",
);

const eventUi = read("src/lib/ui/event-management-ui.ts");
assert.match(eventUi, /desktop-app-event-side-nav/, "secondary uses sticky class");
assert.doesNotMatch(
  eventUi,
  /desktop:relative desktop:top-auto desktop:h-auto/,
  "desktop must not disable secondary sticky",
);
assert.match(eventUi, /eventManagementSideNavScrollClass[\s\S]*overflow-y-auto/, "secondary inner scroll");

const shell = read("src/components/layout/DashboardShell.tsx");
assert.match(shell, /overflow-hidden/, "shell column clips outer scroll");

console.log("verify:manager-nav-scroll-lock: PASS");
