const { copyFileSync, mkdirSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const dist = join(root, "dist");
const assetsDir = join(root, "assets");
mkdirSync(dist, { recursive: true });
mkdirSync(assetsDir, { recursive: true });

const htmlSrc = join(root, "electron", "connection-error.html");
copyFileSync(htmlSrc, join(dist, "connection-error.html"));

// 아이콘은 generate-icons.mjs가 만든 assets/icon.* 를 사용한다.
// public/icon.png(32px)로 덮어쓰지 않는다.
if (!existsSync(join(assetsDir, "icon.ico")) || !existsSync(join(assetsDir, "icon.png"))) {
  console.warn(
    "[desktop] assets/icon.ico 또는 icon.png 없음 — npm --prefix desktop run icons 실행 필요",
  );
}

console.log("[desktop] static assets copied");
