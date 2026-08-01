/**
 * 마지막으로 적용한 웹 배포 버전 (Electron userData).
 * 인증 정보·세션 토큰·비밀번호는 저장하지 않는다.
 */
import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type DesktopWebVersionRecord = {
  webVersion: string;
  checkedAt: string | null;
  appliedAt: string | null;
};

const FILE_NAME = "desktop-web-version.json";

function filePath(): string {
  return join(app.getPath("userData"), FILE_NAME);
}

export function loadAppliedWebVersion(): DesktopWebVersionRecord | null {
  try {
    const path = filePath();
    if (!existsSync(path)) return null;
    const raw = JSON.parse(
      readFileSync(path, "utf8"),
    ) as Partial<DesktopWebVersionRecord>;
    if (typeof raw.webVersion !== "string" || !raw.webVersion.trim()) {
      return null;
    }
    return {
      webVersion: raw.webVersion.trim(),
      checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : null,
      appliedAt: typeof raw.appliedAt === "string" ? raw.appliedAt : null,
    };
  } catch {
    return null;
  }
}

export function saveAppliedWebVersion(
  webVersion: string,
  opts?: { checkedAt?: string | null; appliedAt?: string | null },
): DesktopWebVersionRecord | null {
  try {
    const now = new Date().toISOString();
    const record: DesktopWebVersionRecord = {
      webVersion: webVersion.trim(),
      checkedAt: opts?.checkedAt === undefined ? now : opts.checkedAt,
      appliedAt: opts?.appliedAt === undefined ? now : opts.appliedAt,
    };
    writeFileSync(filePath(), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    return record;
  } catch {
    return null;
  }
}

export function touchWebVersionChecked(webVersion: string): void {
  const prev = loadAppliedWebVersion();
  saveAppliedWebVersion(webVersion, {
    checkedAt: new Date().toISOString(),
    appliedAt: prev?.appliedAt ?? null,
  });
}
