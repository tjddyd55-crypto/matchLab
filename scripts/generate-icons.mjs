import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const ICONS_DIR = path.join(PUBLIC, "icons");
const FAVICON_SVG = path.join(PUBLIC, "favicon.svg");
const BRAND_BLUE = "#0A47FF";

/**
 * Rasterize the fixed-blue favicon SVG onto a transparent square canvas.
 * Uses dense solid shapes (no currentColor) so 16px tabs stay blue.
 */
async function renderSquarePng(size, paddingPercent = 0.06) {
  const padding = Math.round(size * paddingPercent);
  const contentSize = Math.max(1, size - padding * 2);

  return sharp(FAVICON_SVG, { density: Math.max(72, size * 12) })
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

async function writeIcon(relativePath, buffer) {
  const target = path.join(PUBLIC, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
}

async function main() {
  try {
    await fs.access(FAVICON_SVG);
  } catch {
    throw new Error(`Favicon SVG source not found: ${FAVICON_SVG}`);
  }

  const icon16 = await renderSquarePng(16, 0.05);
  const icon32 = await renderSquarePng(32, 0.06);
  const icon48 = await renderSquarePng(48, 0.06);
  const icon180 = await renderSquarePng(180, 0.08);
  const icon192 = await renderSquarePng(192, 0.08);
  const icon512 = await renderSquarePng(512, 0.08);
  // maskable: more safe-area padding, still blue on transparent
  const mask192 = await renderSquarePng(192, 0.12);
  const mask512 = await renderSquarePng(512, 0.12);

  await fs.mkdir(ICONS_DIR, { recursive: true });

  await writeIcon("favicon.ico", await toIco([icon16, icon32, icon48]));
  await writeIcon("favicon-32.png", icon32);
  await writeIcon("icon.png", icon32);
  await writeIcon("apple-touch-icon.png", icon180);
  await writeIcon("apple-icon.png", icon180);
  await writeIcon("icons/icon-192.png", icon192);
  await writeIcon("icons/icon-512.png", icon512);
  await writeIcon("icons/maskable-icon-192.png", mask192);
  await writeIcon("icons/maskable-icon-512.png", mask512);

  console.log(
    `Generated brand-blue (${BRAND_BLUE}) favicons from public/favicon.svg`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
