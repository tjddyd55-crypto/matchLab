/**
 * Static + DOM: Desktop global horizontal scroll without canvas shrink.
 * Maximized windows grow; below baseline floor canvas stays >= 1440.
 *   npm run verify:desktop-global-horizontal-scroll
 *   npm run verify:desktop-canvas-no-shrink
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "@playwright/test";

const root = process.cwd();
const OUT = join(root, "test-results", "desktop-global-scroll");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function testStaticCssContract() {
  const globals = read("src/app/globals.css");
  assert.match(globals, /--desktop-layout-base-width:\s*1440px/);
  assert.match(globals, /--desktop-main-min-width:\s*1216px/);
  assert.match(globals, /--desktop-content-min-width:\s*984px/);
  assert.match(
    globals,
    /html\.desktop-app \.desktop-app-viewport[\s\S]*overflow-x:\s*auto/,
  );
  assert.match(
    globals,
    /html\.desktop-app \.desktop-app-canvas[\s\S]*min-width:\s*var\(--desktop-layout-base-width\)/,
  );
  assert.match(
    globals,
    /width:\s*max\(100%,\s*var\(--desktop-layout-base-width\)\)/,
  );
  assert.doesNotMatch(globals, /transform:\s*scale|zoom:/);

  const sidebarUi = read("src/lib/ui/dashboard-sidebar-ui.ts");
  assert.match(sidebarUi, /dashboardSidebarAsideCanvasClass/);
  assert.doesNotMatch(
    sidebarUi.split("dashboardSidebarAsideCanvasClass")[1]!.slice(0, 400),
    /sticky/,
    "desktop canvas sidebar must not be sticky",
  );

  const dashboard = read("src/components/layout/DashboardShell.tsx");
  assert.match(dashboard, /desktopAppMainClass/, "main min-width class");

  const eventUi = read("src/lib/ui/event-management-ui.ts");
  assert.match(eventUi, /desktop:min-w-\[var\(--desktop-main-min-width\)\]/);
  assert.match(
    eventUi,
    /desktop:grid-cols-\[var\(--event-sidebar-width\)_minmax\(var\(--desktop-content-min-width\),1fr\)\]/,
  );
}

function buildFixtureHtml(): string {
  return `<!doctype html>
<html class="desktop-app" lang="ko">
<head>
<meta charset="utf-8"/>
<style>
  :root {
    --desktop-layout-base-width: 1440px;
    --desktop-layout-base-height: 900px;
    --desktop-main-min-width: 1216px;
    --global-sidebar-width: 14rem;
  }
  html, body { margin: 0; height: 100%; }
  html.desktop-app { overflow: hidden; }
  html.desktop-app body {
    display: flex; flex-direction: column; overflow: hidden; height: 100%;
  }
  html.desktop-app .desktop-app-viewport {
    flex: 1 1 auto; min-height: 0; width: 100%; max-width: 100%; height: 100%;
    overflow-x: auto; overflow-y: hidden;
  }
  html.desktop-app .desktop-app-canvas {
    width: max(100%, var(--desktop-layout-base-width)) !important;
    min-width: var(--desktop-layout-base-width) !important;
    height: 100%; min-height: 100%;
    flex-shrink: 0; display: flex; flex-direction: row;
  }
  .sidebar {
    width: var(--global-sidebar-width); flex: none; background: #0d1117;
  }
  html.desktop-app .desktop-app-main {
    width: var(--desktop-main-min-width);
    min-width: var(--desktop-main-min-width) !important;
    max-width: none !important;
    flex: 1 1 auto !important;
    min-height: 0;
  }
</style>
</head>
<body>
  <div class="desktop-app-viewport" data-desktop-app-viewport>
    <div class="desktop-app-canvas" data-desktop-app-canvas>
      <aside class="sidebar">nav</aside>
      <div class="desktop-app-main">main</div>
    </div>
  </div>
</body>
</html>`;
}

type Metrics = {
  viewportWidth: number;
  canvasWidth: number;
  clientWidth: number;
  scrollWidth: number;
  scrollLeftAfter: number;
  mainWidth: number;
};

async function measure(
  browser: Browser,
  width: number,
  height: number,
): Promise<Metrics> {
  mkdirSync(OUT, { recursive: true });
  const fixturePath = join(OUT, "fixture.html");
  writeFileSync(fixturePath, buildFixtureHtml(), "utf8");
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await page.goto(pathToFileURL(fixturePath).href, {
      waitUntil: "domcontentloaded",
    });
    return await page.evaluate(() => {
      const viewport = document.querySelector(
        "[data-desktop-app-viewport]",
      ) as HTMLElement;
      const canvas = document.querySelector(
        "[data-desktop-app-canvas]",
      ) as HTMLElement;
      const main = document.querySelector(".desktop-app-main") as HTMLElement;
      viewport.scrollLeft = 400;
      return {
        viewportWidth: window.innerWidth,
        canvasWidth: canvas.getBoundingClientRect().width,
        clientWidth: viewport.clientWidth,
        scrollWidth: viewport.scrollWidth,
        scrollLeftAfter: viewport.scrollLeft,
        mainWidth: main.getBoundingClientRect().width,
      };
    });
  } finally {
    await page.close();
  }
}

async function main() {
  testStaticCssContract();

  const cases: Array<[number, number]> = [
    [1920, 1080],
    [1600, 900],
    [1440, 900],
    [1100, 700],
    [900, 600],
  ];
  const browser = await chromium.launch({ headless: true });
  try {
    const report: Record<string, Metrics> = {};
    for (const [w, h] of cases) {
      report[`${w}x${h}`] = await measure(browser, w, h);
    }

    const wide = report["1920x1080"]!;
    assert.equal(wide.canvasWidth, 1920, "maximize canvas grows to viewport");
    assert.ok(wide.mainWidth > 1216, `maximize main grows (${wide.mainWidth})`);

    const baseline = report["1440x900"]!;
    assert.ok(baseline.canvasWidth >= 1440);

    const narrow = report["900x600"]!;
    assert.ok(narrow.canvasWidth >= 1440, "900 canvas floor");
    assert.ok(narrow.scrollWidth > narrow.clientWidth, "outer horizontal scroll");
    assert.ok(narrow.scrollLeftAfter > 0, "scrollLeft moves");

    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("NUMERIC", JSON.stringify(report, null, 2));
    console.log("verify:desktop-global-horizontal-scroll OK");
    console.log("verify:desktop-canvas-no-shrink OK");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
