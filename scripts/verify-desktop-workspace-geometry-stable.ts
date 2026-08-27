/**
 * Desktop workspace geometry must be identical at full vs narrow viewport.
 *   npm run verify:desktop-workspace-geometry-stable
 *   npm run verify:desktop-no-inner-horizontal-scroll
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "@playwright/test";

const root = process.cwd();
const OUT = join(root, "test-results", "desktop-workspace-geometry");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function testStaticContract() {
  const globals = read("src/app/globals.css");
  assert.match(globals, /--desktop-layout-base-width:\s*1600px/);
  assert.match(globals, /--desktop-matched-panel-width:\s*640px/);
  assert.match(globals, /--desktop-unmatched-panel-width:\s*420px/);
  assert.match(globals, /--desktop-workspace-width:\s*1080px/);
  assert.match(
    globals,
    /grid-template-columns:\s*var\(--desktop-matched-panel-width\)/,
  );
  assert.doesNotMatch(
    read("src/components/domain/brackets/OrganizerAllMatchesWorkspaceClient.tsx"),
    /desktop:grid-cols-\[minmax\(560px/,
  );
  assert.match(
    read("src/components/domain/brackets/OrganizerAllMatchesWorkspaceClient.tsx"),
    /desktopWorkspaceGridClass/,
  );
  assert.doesNotMatch(
    read("src/lib/ui/compact-filter-toolbar.ts"),
    /max-\[1365px\]/,
  );
}

function buildFixtureHtml(): string {
  return `<!doctype html>
<html class="desktop-app" lang="ko">
<head>
<meta charset="utf-8"/>
<style>
  :root {
    --desktop-layout-base-width: 1600px;
    --desktop-layout-base-height: 900px;
    --desktop-main-width: 1376px;
    --desktop-event-content-width: 1144px;
    --desktop-workspace-width: 1080px;
    --desktop-matched-panel-width: 640px;
    --desktop-unmatched-panel-width: 420px;
    --desktop-workspace-gap: 20px;
    --global-sidebar-width: 14rem;
    --event-sidebar-width: 232px;
  }
  html, body { margin: 0; height: 100%; }
  html.desktop-app { overflow: hidden; }
  html.desktop-app body {
    display: flex; flex-direction: column; overflow: hidden; height: 100%;
  }
  html.desktop-app .desktop-app-viewport {
    flex: 1 1 auto; min-height: 0; width: 100%; max-width: 100%;
    overflow-x: auto; overflow-y: auto;
  }
  html.desktop-app .desktop-app-canvas {
    width: max(100%, var(--desktop-layout-base-width)) !important;
    min-width: var(--desktop-layout-base-width) !important;
    min-height: max(100%, var(--desktop-layout-base-height));
    flex: none; display: flex; flex-direction: row;
  }
  .sidebar {
    width: var(--global-sidebar-width); flex: none; background: #0d1117; color: #fff;
  }
  html.desktop-app .desktop-app-main {
    width: var(--desktop-main-width) !important;
    min-width: var(--desktop-main-width) !important;
    flex: none !important; display: flex;
  }
  .event-sidebar {
    width: var(--event-sidebar-width); flex: none; background: #fff; border-right: 1px solid #e2e8f0;
  }
  .event-main {
    width: var(--desktop-event-content-width);
    min-width: var(--desktop-event-content-width);
    padding: 1.75rem 2rem; box-sizing: border-box; background: #f8fafc;
  }
  html.desktop-app .desktop-workspace-grid {
    display: grid;
    width: var(--desktop-workspace-width) !important;
    min-width: var(--desktop-workspace-width) !important;
    max-width: var(--desktop-workspace-width) !important;
    grid-template-columns: var(--desktop-matched-panel-width) var(--desktop-unmatched-panel-width) !important;
    column-gap: var(--desktop-workspace-gap) !important;
  }
  html.desktop-app .desktop-matched-panel {
    width: var(--desktop-matched-panel-width) !important;
    overflow-x: hidden !important;
    background: #fff; border: 1px solid #e2e8f0; box-sizing: border-box;
  }
  html.desktop-app .desktop-unmatched-panel {
    width: var(--desktop-unmatched-panel-width) !important;
    overflow-x: hidden !important;
    background: #fff; border: 1px solid #e2e8f0; box-sizing: border-box;
  }
  .match-card {
    box-sizing: border-box; width: 100%;
    display: grid; grid-template-columns: minmax(0,1fr) 4.5rem minmax(0,1fr);
    border: 1px solid #cbd5e1; padding: 8px; margin: 0;
  }
  .toolbar { display: flex; flex-wrap: nowrap; gap: 8px; margin-bottom: 12px; }
</style>
</head>
<body>
  <div class="desktop-app-viewport" data-desktop-app-viewport>
    <div class="desktop-app-canvas" data-desktop-app-canvas>
      <aside class="sidebar">nav</aside>
      <div class="desktop-app-main">
        <aside class="event-sidebar">event</aside>
        <div class="event-main">
          <div class="toolbar" data-desktop-toolbar>
            <button>인쇄</button><button>PDF 다운로드</button><button>미매칭 선수 PDF</button>
          </div>
          <div class="desktop-workspace-grid" data-desktop-workspace-grid>
            <div class="desktop-matched-panel" data-desktop-matched-panel data-bracket-workspace-list="matched">
              <div class="match-card" data-desktop-match-card><div>RED</div><div>VS</div><div>BLUE</div></div>
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
      if (!viewport || !canvas || !main || !workspace || !matched || !unmatched || !card) {
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
        workspaceWidth: workspace.getBoundingClientRect().width,
        matchedWidth: matched.getBoundingClientRect().width,
        unmatchedWidth: unmatched.getBoundingClientRect().width,
        matchCardWidth: card.getBoundingClientRect().width,
        matchedScrollWidth: matched.scrollWidth,
        matchedClientWidth: matched.clientWidth,
        unmatchedScrollWidth: unmatched.scrollWidth,
        unmatchedClientWidth: unmatched.clientWidth,
      };
    });
  } finally {
    await page.close();
  }
}

function nearlyEqual(a: number, b: number, label: string, tol = 1) {
  assert.ok(
    Math.abs(a - b) <= tol,
    `${label}: ${a} vs ${b} (tol ${tol})`,
  );
}

async function main() {
  testStaticContract();

  const browser = await chromium.launch({ headless: true });
  try {
    const full = await measure(browser, 1600, 900);
    const narrow = await measure(browser, 900, 600);

    assert.ok(full.canvasWidth >= 1600, `full canvas ${full.canvasWidth}`);
    assert.equal(full.workspaceWidth, 1080);
    assert.equal(full.matchedWidth, 640);
    assert.equal(full.unmatchedWidth, 420);

    assert.ok(narrow.canvasWidth >= 1600, `900 canvas ${narrow.canvasWidth}`);
    assert.ok(narrow.scrollWidth > narrow.clientWidth, "outer horizontal scroll");
    assert.ok(narrow.scrollLeftAfter > 0, "scrollLeft moves");

    nearlyEqual(full.workspaceWidth, narrow.workspaceWidth, "workspace delta");
    nearlyEqual(full.matchedWidth, narrow.matchedWidth, "matched delta");
    nearlyEqual(full.unmatchedWidth, narrow.unmatchedWidth, "unmatched delta");
    nearlyEqual(full.matchCardWidth, narrow.matchCardWidth, "card delta");

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

    const report = { full, narrow };
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("GEOMETRY", JSON.stringify(report, null, 2));
    console.log("verify:desktop-workspace-geometry-stable OK");
    console.log("verify:desktop-no-inner-horizontal-scroll OK");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
