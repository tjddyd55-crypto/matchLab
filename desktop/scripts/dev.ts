/**
 * desktop:dev — Next 서버 readiness 확인 후 Electron 실행.
 * 이미 서버가 떠 있으면 재시작하지 않고 재사용한다.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const DESKTOP = join(__dirname, "..");
const PORT = Number(process.env.PORT || 8080);
const BASE =
  process.env.MATCHON_DESKTOP_BASE_URL?.trim() || `http://localhost:${PORT}`;

function canListen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready: ${url}`);
}

async function main(): Promise<void> {
  let nextProc: ChildProcess | null = null;
  const portFree = await canListen(PORT);

  if (portFree) {
    console.log(`[desktop:dev] starting Next.js on :${PORT}`);
    nextProc = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev", "--", "-p", String(PORT)],
      {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env },
      },
    );
  } else {
    console.log(`[desktop:dev] reusing existing server on :${PORT}`);
  }

  const probe = `${BASE}/desktop`;
  console.log(`[desktop:dev] waiting for ${probe}`);
  await waitForUrl(probe, 120_000);

  console.log("[desktop:dev] building electron main…");
  await new Promise<void>((resolve, reject) => {
    const build = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "build"],
      { cwd: DESKTOP, stdio: "inherit" },
    );
    build.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`electron build failed: ${code}`)),
    );
  });

  console.log("[desktop:dev] launching Electron");
  const electronBin = require("electron") as string;
  const electronProc = spawn(electronBin, ["."], {
    cwd: DESKTOP,
    stdio: "inherit",
    env: {
      ...process.env,
      MATCHON_DESKTOP_BASE_URL: BASE,
    },
  });

  const shutdown = () => {
    if (!electronProc.killed) electronProc.kill();
    if (nextProc && !nextProc.killed) nextProc.kill();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  electronProc.on("exit", (code) => {
    if (nextProc && !nextProc.killed) nextProc.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("[desktop:dev]", err);
  process.exit(1);
});
