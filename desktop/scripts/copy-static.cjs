const { copyFileSync, mkdirSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

const htmlSrc = join(root, "electron", "connection-error.html");
const htmlDest = join(dist, "connection-error.html");
copyFileSync(htmlSrc, htmlDest);

const iconSrc = join(root, "..", "public", "icon.png");
const assetsDir = join(root, "assets");
mkdirSync(assetsDir, { recursive: true });
if (existsSync(iconSrc)) {
  copyFileSync(iconSrc, join(assetsDir, "icon.png"));
}

console.log("[desktop] static assets copied");
