/**
 * MATCHON Manager Windows 아이콘 생성
 * 소스: public/favicon.svg (웹 좌상단 MatchonLogo와 동일 브랜드 마크)
 *
 *   npm --prefix desktop run icons
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(DESKTOP_ROOT, "..");
const SVG_SRC = path.join(REPO_ROOT, "public", "favicon.svg");
const ASSETS = path.join(DESKTOP_ROOT, "assets");
const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function renderSquarePng(size, paddingPercent = 0.08) {
  const padding = Math.max(1, Math.round(size * paddingPercent));
  const contentSize = Math.max(1, size - padding * 2);
  return sharp(SVG_SRC, { density: Math.max(72, size * 12) })
    .resize(contentSize, contentSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  await fs.access(SVG_SRC);
  await fs.mkdir(ASSETS, { recursive: true });

  const buffers = [];
  for (const size of SIZES) {
    const buf = await renderSquarePng(size, size <= 32 ? 0.06 : 0.08);
    buffers.push(buf);
    await fs.writeFile(path.join(ASSETS, `icon-${size}.png`), buf);
  }

  const ico = await toIco(buffers);
  await fs.writeFile(path.join(ASSETS, "icon.ico"), ico);
  // electron-builder / 일부 경로용 고해상도 PNG SSOT
  await fs.writeFile(path.join(ASSETS, "icon.png"), buffers[buffers.length - 1]);

  console.log(
    `[desktop:icons] wrote icon.ico + icon.png from ${path.relative(REPO_ROOT, SVG_SRC)} (${SIZES.join(", ")})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
