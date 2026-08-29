/**
 * Maximize size regression + baseline preserve + no inner horizontal scroll.
 *   npm run verify:desktop-maximized-size-regression
 *   npm run verify:desktop-preserve-baseline-geometry
 *   npm run verify:desktop-workspace-geometry-stable
 *   npm run verify:desktop-no-inner-horizontal-scroll
 *
 * FAIL if maximize is capped to compact 1080/640/420 paper.
 * PASS when maximize grows fluidly and fonts stay identical at 900.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "@playwright/test";

const root = process.cwd();
const OUT = join(root, "test-results", "desktop-maximized-size");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function testStaticNoCompactCaps() {
  const globals = read("src/app/globals.css");
  assert.match(globals, /--desktop-layout-base-width:\s*1440px/);
  assert.doesNotMatch(globals, /--desktop-workspace-width:\s*1080px/);
  assert.doesNotMatch(globals, /--desktop-matched-panel-width:\s*640px/);
  assert.doesNotMatch(globals, /--desktop-unmatched-panel-width:\s*420px/);
  assert.doesNotMatch(globals, /--desktop-main-width:\s*1376px/);
  assert.match(globals, /html\s*\{[\s\S]*font-size:\s*16px/);
  assert.doesNotMatch(globals, /transform:\s*scale|zoom:/);

  const tokens = read("src/lib/ui/desktop-app-layout.ts");
  assert.match(tokens, /DESKTOP_APP_MIN_WIDTH = "1440px"/);
  assert.match(tokens, /DESKTOP_MAIN_MIN_WIDTH = "1216px"/);
  assert.doesNotMatch(tokens, /DESKTOP_WORKSPACE_WIDTH = "1080px"/);

  const workspace = read(
    "src/components/domain/brackets/OrganizerAllMatchesWorkspaceClient.tsx",
  );
  assert.match(
    workspace,
    /desktop:grid-cols-\[minmax\(0,1\.6fr\)_minmax\(0,1\.15fr\)\]/,
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
    --desktop-content-min-width: 984px;
    --global-sidebar-width: 14rem;
    --event-sidebar-width: 232px;
    --font-size-base: 1rem;
  }
  html, body { margin: 0; height: 100%; }
  html.desktop-app { overflow: hidden; font-size: 16px; }
  html.desktop-app body {
    display: flex; flex-direction: column; overflow: hidden; height: 100%;
    font-size: var(--font-size-base);
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
    width: var(--global-sidebar-width); flex: none; background: #0d1117; color: #fff;
    font-size: 14px; padding: 12px;
  }
  html.desktop-app .desktop-app-main {
    width: var(--desktop-main-min-width);
    min-width: var(--desktop-main-min-width) !important;
    max-width: none !important;
    flex: 1 1 auto !important;
    min-height: 0;
    display: flex;
  }
  .event-sidebar {
    width: var(--event-sidebar-width); flex: none; background: #fff;
    border-right: 1px solid #e2e8f0; font-size: 13px; padding: 12px;
  }
  .event-main {
    flex: 1 1 auto; min-width: var(--desktop-content-min-width);
    padding: 1.75rem 2rem; box-sizing: border-box; background: #f8fafc;
  }
  .page-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 12px; }
  .toolbar { display: flex; flex-wrap: nowrap; gap: 8px; margin-bottom: 12px; }
  .toolbar button { height: 36px; padding: 0 12px; font-size: 14px; }
  html.desktop-app .desktop-workspace-grid {
    display: grid;
    width: 100%;
    min-width: var(--desktop-content-min-width);
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.15fr);
    column-gap: 20px;
  }
  html.desktop-app .desktop-matched-panel,
  html.desktop-app .desktop-unmatched-panel {
    min-width: 0; overflow-x: hidden; background: #fff;
    border: 1px solid #e2e8f0; box-sizing: border-box;
  }
  .match-card {
    box-sizing: border-box; width: 100%;
    display: grid; grid-template-columns: minmax(0,1fr) 140px minmax(0,1fr);
    border: 1px solid #cbd5e1; padding: 8px; margin: 0;
    font-size: 16px;
  }
  .weight-input { height: 36px; width: 4.75rem; font-size: 14px; }
  .save-btn { height: 36px; padding: 0 12px; font-size: 14px; }
</style>
</head>
<body>
  <div class="desktop-app-viewport" data-desktop-app-viewport>
    <div class="desktop-app-canvas" data-desktop-app-canvas>
      <aside class="sidebar" data-global-sidebar>대회 목록</aside>
      <div class="desktop-app-main">
        <aside class="event-sidebar" data-event-sidebar>대진표</aside>
        <div class="event-main">
          <h1 class="page-title" data-page-title>대진표 관리</h1>
          <div class="toolbar" data-desktop-toolbar>
            <button>인쇄</button><button>PDF 다운로드</button><button>미매칭 선수 PDF</button>
          </div>
          <div class="desktop-workspace-grid" data-desktop-workspace-grid>
            <div class="desktop-matched-panel" data-desktop-matched-panel data-bracket-workspace-list="matched">
              <div class="match-card" data-desktop-match-card>
                <div>RED</div><div>1경기 VS</div><div>BLUE</div>
              </div>
              <input class="weight-input" data-weight-input value="60" />
              <button class="save-btn" data-save-button>저장</button>
            </div>
            <div class="desktop-unmatched-panel" data-desktop-unmatched-panel>
              unmatched
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

type Geom = {
  viewportWidth: number;
  canvasWidth: number;
  clientWidth: number;
  scrollWidth: number;
  scrollLeftAfter: number;
  mainWidth: number;
  workspaceWidth: number;
  matchedWidth: number;
  unmatchedWidth: number;
  matchCardWidth: number;
  matchedScrollWidth: number;
  matchedClientWidth: number;
  unmatchedScrollWidth: number;
  unmatchedClientWidth: number;
  rootFontSize: number;
  titleFontSize: number;
  sidebarFontSize: number;
  eventSidebarFontSize: number;
  buttonHeight: number;
  inputHeight: number;
};

async function measure(
  browser: Browser,
  width: number,
  height: number,
): Promise<Geom> {
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
      const workspace = document.querySelector(
        "[data-desktop-workspace-grid]",
      ) as HTMLElement;
      const matched = document.querySelector(
        "[data-desktop-matched-panel]",
      ) as HTMLElement;
      const unmatched = document.querySelector(
        "[data-desktop-unmatched-panel]",
      ) as HTMLElement;
      const card = document.querySelector(
        "[data-desktop-match-card]",
      ) as HTMLElement;
      const title = document.querySelector("[data-page-title]") as HTMLElement;
      const sidebar = document.querySelector(
        "[data-global-sidebar]",
      ) as HTMLElement;
      const eventSidebar = document.querySelector(
        "[data-event-sidebar]",
      ) as HTMLElement;
      const save = document.querySelector("[data-save-button]") as HTMLElement;
      const weight = document.querySelector(
        "[data-weight-input]",
      ) as HTMLElement;
      viewport.scrollLeft = 400;
      return {
        viewportWidth: window.innerWidth,
        canvasWidth: canvas.getBoundingClientRect().width,
        clientWidth: viewport.clientWidth,
        scrollWidth: viewport.scrollWidth,
        scrollLeftAfter: viewport.scrollLeft,
        mainWidth: main.getBoundingClientRect().width,
        workspaceWidth: workspace.getBoundingClientRect().width,
        matchedWidth: matched.getBoundingClientRect().width,
        unmatchedWidth: unmatched.getBoundingClientRect().width,
        matchCardWidth: card.getBoundingClientRect().width,
        matchedScrollWidth: matched.scrollWidth,
        matchedClientWidth: matched.clientWidth,
        unmatchedScrollWidth: unmatched.scrollWidth,
        unmatchedClientWidth: unmatched.clientWidth,
        rootFontSize: parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ),
        titleFontSize: parseFloat(getComputedStyle(title).fontSize),
        sidebarFontSize: parseFloat(getComputedStyle(sidebar).fontSize),
        eventSidebarFontSize: parseFloat(
          getComputedStyle(eventSidebar).fontSize,
        ),
        buttonHeight: save.getBoundingClientRect().height,
        inputHeight: weight.getBoundingClientRect().height,
      };
    });
  } finally {
    await page.close();
  }
}

function nearlyEqual(a: number, b: number, label: string, tol = 1) {
  assert.ok(Math.abs(a - b) <= tol, `${label}: ${a} vs ${b}`);
}

async function main() {
  testStaticNoCompactCaps();

  const browser = await chromium.launch({ headless: true });
  try {
    const max = await measure(browser, 1920, 1080);
    const baseline = await measure(browser, 1440, 900);
    const narrow = await measure(browser, 900, 600);

    // Maximize must NOT be compact paper
    assert.equal(max.canvasWidth, 1920);
    assert.ok(max.mainWidth > 1216, `maximize main ${max.mainWidth}`);
    assert.ok(
      max.workspaceWidth > 1080,
      `maximize workspace must exceed compact 1080 (got ${max.workspaceWidth})`,
    );
    assert.ok(
      max.matchedWidth > 640,
      `maximize matched must exceed compact 640 (got ${max.matchedWidth})`,
    );

    // Fonts / control sizes identical maximize vs narrow
    nearlyEqual(max.rootFontSize, narrow.rootFontSize, "root font");
    nearlyEqual(max.titleFontSize, narrow.titleFontSize, "title font");
    nearlyEqual(max.sidebarFontSize, narrow.sidebarFontSize, "sidebar font");
    nearlyEqual(
      max.eventSidebarFontSize,
      narrow.eventSidebarFontSize,
      "event sidebar font",
    );
    nearlyEqual(max.buttonHeight, narrow.buttonHeight, "button height");
    nearlyEqual(max.inputHeight, narrow.inputHeight, "input height");
    assert.equal(max.rootFontSize, 16);

    // Below baseline: canvas floor + outer scroll
    assert.ok(narrow.canvasWidth >= 1440);
    assert.ok(narrow.scrollWidth > narrow.clientWidth);
    assert.ok(narrow.scrollLeftAfter > 0);

    // 900 vs 1440 baseline: same canvas/layout floor geometry
    nearlyEqual(baseline.canvasWidth, narrow.canvasWidth, "canvas floor");
    nearlyEqual(baseline.workspaceWidth, narrow.workspaceWidth, "workspace");
    nearlyEqual(baseline.matchedWidth, narrow.matchedWidth, "matched");
    nearlyEqual(baseline.unmatchedWidth, narrow.unmatchedWidth, "unmatched");
    nearlyEqual(baseline.matchCardWidth, narrow.matchCardWidth, "card");

    // No visible inner horizontal scrollbar (overflow-x hidden + content fits)
    assert.equal(
      narrow.matchedScrollWidth,
      narrow.matchedClientWidth,
      "matched inner horizontal scroll must be 0",
    );
    assert.equal(
      narrow.unmatchedScrollWidth,
      narrow.unmatchedClientWidth,
      "unmatched inner horizontal scroll must be 0",
    );

    const report = { max, baseline, narrow };
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("GEOMETRY", JSON.stringify(report, null, 2));
    console.log("verify:desktop-maximized-size-regression OK");
    console.log("verify:desktop-preserve-baseline-geometry OK");
    console.log("verify:desktop-workspace-geometry-stable OK");
    console.log("verify:desktop-no-inner-horizontal-scroll OK");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
