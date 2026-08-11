/**
 * Runtime source 에 브라우저 native dialog 가 없는지 검증.
 *   npm run verify:no-native-dialogs
 *
 * 허용: 주석, app-confirm-dialog SSOT 문서 문자열
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".html"]);

/** 주석/문서 외에 금지하는 패턴 */
const FORBIDDEN = [
  /\bwindow\.alert\s*\(/,
  /\bwindow\.confirm\s*\(/,
  /\bwindow\.prompt\s*\(/,
  /\bglobalThis\.alert\s*\(/,
  /\bglobalThis\.confirm\s*\(/,
  /\bglobalThis\.prompt\s*\(/,
];

const ALLOWED_PATH_SUBSTRINGS = [
  "components/shared/app-confirm-dialog.tsx",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "generated" || name === "node_modules") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    const ext = name.slice(name.lastIndexOf("."));
    if (EXTENSIONS.has(ext)) out.push(full);
  }
  return out;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function main() {
  const hits: string[] = [];
  for (const file of walk(ROOT)) {
    const rel = relative(process.cwd(), file).replace(/\\/g, "/");
    if (ALLOWED_PATH_SUBSTRINGS.some((p) => rel.includes(p))) {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const re of FORBIDDEN) {
        if (re.test(code)) {
          hits.push(`${rel}: runtime call matched ${re}`);
        }
      }
      continue;
    }
    const code = stripComments(readFileSync(file, "utf8"));
    for (const re of FORBIDDEN) {
      if (re.test(code)) {
        hits.push(`${rel}: matched ${re}`);
      }
    }
  }

  assert.equal(
    hits.length,
    0,
    `native dialog 금지 위반:\n${hits.join("\n")}`,
  );
  console.log("verify:no-native-dialogs: OK");
}

main();
