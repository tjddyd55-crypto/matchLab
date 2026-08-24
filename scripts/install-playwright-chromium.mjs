/**
 * Install Playwright Chromium into node_modules so Railway runtime can find it.
 * Default ~/.cache path is not preserved across Railpack build/runtime layers.
 */
import { spawnSync } from "node:child_process";

process.env.PLAYWRIGHT_BROWSERS_PATH = "0";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["playwright", "install", "chromium", "chromium-headless-shell"],
  { stdio: "inherit", env: process.env },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
