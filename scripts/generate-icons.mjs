import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "public", "brand", "logo.png");
const PUBLIC = path.join(ROOT, "public");
const ICONS_DIR = path.join(PUBLIC, "icons");

async function resizeSquarePng(size, paddingPercent = 0) {
  const padding = Math.round(size * paddingPercent);
  const contentSize = Math.max(1, size - padding * 2);

  return sharp(SOURCE)
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
    await fs.access(SOURCE);
  } catch {
    throw new Error(`Logo source not found: ${SOURCE}`);
  }

  const icon16 = await resizeSquarePng(16);
  const icon32 = await resizeSquarePng(32);
  const icon180 = await resizeSquarePng(180);
  const icon192 = await resizeSquarePng(192);
  const icon512 = await resizeSquarePng(512);
  const mask192 = await resizeSquarePng(192, 0.1);
  const mask512 = await resizeSquarePng(512, 0.1);

  await fs.mkdir(ICONS_DIR, { recursive: true });

  await writeIcon("favicon.ico", await toIco([icon16, icon32]));
  await writeIcon("icon.png", icon32);
  await writeIcon("apple-touch-icon.png", icon180);
  await writeIcon("icons/icon-192.png", icon192);
  await writeIcon("icons/icon-512.png", icon512);
  await writeIcon("icons/maskable-icon-192.png", mask192);
  await writeIcon("icons/maskable-icon-512.png", mask512);

  console.log("Generated brand icons from public/brand/logo.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
