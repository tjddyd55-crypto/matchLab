/**
 * Tailwind v4 @source SSOT — production UI는 src/ 만 스캔.
 * 루트 전역 scan 회귀·src 밖 production className 누락을 막는다.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function main() {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /@import\s+"tailwindcss"\s+source\(none\)/);
  assert.match(css, /@source\s+"\.\."/);
  assert.doesNotMatch(css, /@import\s+"tailwindcss";\s*\n/);

  const tracked = execSync(
    'git ls-files "*.tsx" "*.jsx" "*.html"',
    { encoding: "utf8" },
  )
    .split(/\r?\n/)
    .filter(Boolean);

  const outsideSrc = tracked.filter((p) => !p.startsWith("src/"));
  const outsideWithClassAttr = outsideSrc.filter((p) => {
    const body = readFileSync(p, "utf8");
    return /className=|class=/.test(body);
  });

  // desktop Electron offline page uses inline <style>, not Tailwind utilities
  for (const p of outsideWithClassAttr) {
    const body = readFileSync(p, "utf8");
    const hasTwUtility =
      /\b(flex|grid|bg-|text-|rounded-|border-|p-\d|m-\d|gap-\d|w-|h-|min-h-|shadow-)/.test(
        body,
      ) && !body.includes("<style>");
    assert.equal(
      hasTwUtility,
      false,
      `unexpected Tailwind-like utilities outside src: ${p}`,
    );
  }

  console.log("verify:tailwind-source-scope OK", {
    scanRoot: "src/ (@source \"..\" from src/app/globals.css)",
    trackedOutsideSrc: outsideSrc.length,
    outsideWithClassAttr: outsideWithClassAttr.map((p) => p),
  });
}

main();
