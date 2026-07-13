import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SVG_PATH = path.join(ROOT, "public/brand/matchon-icon.svg");
const PUBLIC_DIR = path.join(ROOT, "public");

async function renderPng(
  size: number,
  outPath: string,
  options?: { maskable?: boolean },
) {
  const padding = options?.maskable ? Math.round(size * 0.18) : 0;
  const inner = size - padding * 2;
  const svg = await sharp(SVG_PATH)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: options?.maskable
        ? { r: 10, g: 71, b: 255, alpha: 1 }
        : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: svg, gravity: "centre" }])
    .png()
    .toFile(outPath);
}

async function renderFavicon(outPath: string) {
  await sharp(SVG_PATH)
    .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(outPath.replace(/\.ico$/, "-32.png"));

  const png32 = await sharp(SVG_PATH)
    .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  await writeFile(outPath, png32);
}

async function main() {
  await mkdir(path.join(PUBLIC_DIR, "icons"), { recursive: true });

  const targets: Array<{ file: string; size: number; maskable?: boolean }> = [
    { file: "icon.png", size: 32 },
    { file: "apple-touch-icon.png", size: 180 },
    { file: "icons/icon-192.png", size: 192 },
    { file: "icons/icon-512.png", size: 512 },
    { file: "icons/maskable-icon-192.png", size: 192, maskable: true },
    { file: "icons/maskable-icon-512.png", size: 512, maskable: true },
  ];

  for (const target of targets) {
    const out = path.join(PUBLIC_DIR, target.file);
    await renderPng(target.size, out, { maskable: target.maskable });
    console.log(`wrote ${target.file}`);
  }

  await renderFavicon(path.join(PUBLIC_DIR, "favicon.ico"));
  console.log("wrote favicon.ico (32px PNG payload)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
