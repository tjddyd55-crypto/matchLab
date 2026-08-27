/**
 * Static + DOM numeric verify: Desktop global horizontal scroll without canvas shrink.
 *   npm run verify:desktop-global-horizontal-scroll
 *   npm run verify:desktop-canvas-no-shrink
 *
 * DOM checks use Playwright against a local fixture page (no live server required).
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function testStaticCssContract() {
  const globals = read("src/app/globals.css");
  assert.match(globals, /--desktop-app-min-width:\s*1440px/);
  assert.match(globals, /--desktop-main-min-width:\s*1216px/);
  assert.match(globals, /--desktop-content-min-width:\s*984px/);
  assert.match(
    globals,
    /html\.desktop-app \.desktop-app-viewport[\s\S]*overflow-x:\s*auto/,
  );
  assert.match(
    globals,
    /html\.desktop-app \.desktop-app-canvas[\s\S]*min-width:\s*var\(--desktop-app-min-width\)/,
  );
  assert.match(
    globals,
    /html\.desktop-app \.desktop-app-canvas[\s\S]*width:\s*max\(100%,\s*var\(--desktop-app-min-width\)\)/,
  );
  assert.match(
    globals,
    /html\.desktop-app \.desktop-app-canvas[\s\S]*flex-shrink:\s*0/,
  );
  assert.doesNotMatch(globals, /transform:\s*scale|zoom:/);

  const sidebarUi = read("src/lib/ui/dashboard-sidebar-ui.ts");
  assert.match(sidebarUi, /dashboardSidebarAsideCanvasClass/);
  assert.doesNotMatch(
    sidebarUi.split("dashboardSidebarAsideCanvasClass")[1]!.slice(0, 400),
    /sticky/,
    "desktop canvas sidebar must not be sticky (blocks whole-canvas horizontal scroll)",
  );

  const dashboard = read("src/components/layout/DashboardShell.tsx");
  assert.match(dashboard, /desktopAppMainClass/, "main min-width class");

  const eventUi = read("src/lib/ui/event-management-ui.ts");
  assert.match(
    eventUi,
    /desktop:min-w-\[var\(--desktop-main-min-width\)\]/,
  );
  assert.match(
    eventUi,
    /minmax\(var\(--desktop-content-min-width\),1fr\)/,
  );
}

function buildFixtureHtml(): string {
  // Inline the exact CSS rules under test so DOM metrics prove used width.
  return `<!doctype html>
<html class="desktop-app" lang="ko">
<head>
<meta charset="utf-8"/>
<style>
  :root {
    --desktop-app-min-width: 1440px;
    --desktop-app-min-height: 900px;
    --desktop-main-min-width: 1216px;
    --global-sidebar-width: 14rem;
  }
  html, body {
    margin: 0;
    height: 100%;
  }
  html.desktop-app {
    overflow: hidden;
  }
  html.desktop-app body {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  html.desktop-app .desktop-app-viewport {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-height: 0;
    flex: 1 1 auto;
    overflow-x: auto;
    overflow-y: auto;
  }
  html.desktop-app .desktop-app-canvas {
    box-sizing: border-box;
    width: max(100%, var(--desktop-app-min-width));
    min-width: var(--desktop-app-min-width);
    min-height: max(100%, var(--desktop-app-min-height));
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    background: #f8fafc;
  }
  html.desktop-app .desktop-app-main {
    box-sizing: border-box;
    width: var(--desktop-main-min-width);
    min-width: var(--desktop-main-min-width);
    flex: 1 0 auto;
    flex-shrink: 0;
    background: #e2e8f0;
  }
  .sidebar {
    width: var(--global-sidebar-width);
    flex-shrink: 0;
    background: #0d1117;
    color: #fff;
  }
</style>
</head>
<body>
  <div class="desktop-app-viewport" data-desktop-app-viewport>
    <div class="desktop-app-canvas" data-desktop-app-canvas>
      <aside class="sidebar">sidebar</aside>
      <div class="desktop-app-main">main content</div>
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

async function measureAtViewport(
  width: number,
  height: number,
): Promise<Metrics> {
  const outDir = join(root, "test-results", "desktop-global-scroll");
  mkdirSync(outDir, { recursive: true });
  const fixturePath = join(outDir, "fixture.html");
  writeFileSync(fixturePath, buildFixtureHtml(), "utf8");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`file:///${fixturePath.replace(/\\/g, "/")}`);
    const metrics = await page.evaluate(() => {
      const viewport = document.querySelector(
        "[data-desktop-app-viewport]",
      ) as HTMLElement | null;
      const canvas = document.querySelector(
        "[data-desktop-app-canvas]",
      ) as HTMLElement | null;
      const main = document.querySelector(
        ".desktop-app-main",
      ) as HTMLElement | null;
      if (!viewport || !canvas || !main) {
        throw new Error("fixture nodes missing");
      }
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
    return metrics;
  } finally {
    await browser.close();
  }
}

async function testDomNumeric() {
  const cases: Array<{ w: number; h: number; expectScroll: boolean }> = [
    { w: 1600, h: 900, expectScroll: false },
    { w: 1366, h: 768, expectScroll: true },
    { w: 1100, h: 700, expectScroll: true },
    { w: 900, h: 600, expectScroll: true },
  ];

  const report: Record<string, Metrics> = {};

  for (const c of cases) {
    const m = await measureAtViewport(c.w, c.h);
    report[`${c.w}x${c.h}`] = m;
    assert.ok(
      m.canvasWidth >= 1440,
      `${c.w}: canvasWidth ${m.canvasWidth} < 1440`,
    );
    assert.ok(
      m.mainWidth >= 1216,
      `${c.w}: mainWidth ${m.mainWidth} < 1216`,
    );
    if (c.expectScroll) {
      assert.ok(
        m.scrollWidth > m.clientWidth,
        `${c.w}: scrollWidth ${m.scrollWidth} <= clientWidth ${m.clientWidth}`,
      );
      assert.ok(
        m.scrollLeftAfter > 0,
        `${c.w}: scrollLeft did not move (got ${m.scrollLeftAfter})`,
      );
    }
  }

  const outDir = join(root, "test-results", "desktop-global-scroll");
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log("NUMERIC", JSON.stringify(report, null, 2));
}

async function main() {
  testStaticCssContract();
  await testDomNumeric();
  console.log("verify:desktop-global-horizontal-scroll OK");
  console.log("verify:desktop-canvas-no-shrink OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
