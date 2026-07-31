import { app, screen, type BrowserWindow } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type WindowState = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
};

const DEFAULT_STATE: WindowState = {
  width: 1440,
  height: 900,
};

function stateFilePath(): string {
  return join(app.getPath("userData"), "window-state.json");
}

function isVisibleOnAnyDisplay(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return true;
  const bounds = {
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
  };
  return screen.getAllDisplays().some((display) => {
    const a = display.workArea;
    const overlapX = Math.min(bounds.x + bounds.width, a.x + a.width) - Math.max(bounds.x, a.x);
    const overlapY = Math.min(bounds.y + bounds.height, a.y + a.height) - Math.max(bounds.y, a.y);
    return overlapX > 80 && overlapY > 80;
  });
}

export function loadWindowState(): WindowState {
  try {
    const path = stateFilePath();
    if (!existsSync(path)) return { ...DEFAULT_STATE };
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<WindowState>;
    const state: WindowState = {
      width: Math.max(1100, Number(raw.width) || DEFAULT_STATE.width),
      height: Math.max(700, Number(raw.height) || DEFAULT_STATE.height),
      x: typeof raw.x === "number" ? raw.x : undefined,
      y: typeof raw.y === "number" ? raw.y : undefined,
      maximized: Boolean(raw.maximized),
    };
    if (!isVisibleOnAnyDisplay(state)) {
      return {
        width: state.width,
        height: state.height,
        maximized: state.maximized,
      };
    }
    return state;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function persistWindowState(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  const isMaximized = win.isMaximized();
  const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    maximized: isMaximized,
  };
  try {
    const dir = app.getPath("userData");
    mkdirSync(dir, { recursive: true });
    writeFileSync(stateFilePath(), JSON.stringify(state), "utf8");
  } catch {
    /* ignore persistence failures */
  }
}

export function attachWindowStatePersistence(win: BrowserWindow): void {
  const save = () => persistWindowState(win);
  win.on("resize", save);
  win.on("move", save);
  win.on("close", save);
}
