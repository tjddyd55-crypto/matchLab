/**
 * 더원체육관 등 Excel 회원 export 파서.
 * header row는 known 23컬럼으로 자동 탐지 (보통 2행).
 */
import ExcelJS from "exceljs";

export const MEMBER_IMPORT_HEADERS = [
  "회원명",
  "연락처",
  "회원번호",
  "상태",
  "구분",
  "수업명",
  "회원권",
  "회원권타입",
  "담당강사",
  "거래일",
  "이용시작일",
  "이용종료일",
  "기간/횟수",
  "잔여일",
  "잔여횟수",
  "예약횟수",
  "이용횟수",
  "강습료",
  "세액",
  "회원권메모",
  "회원등급",
  "그룹",
  "지점명",
] as const;

export type MemberImportHeader = (typeof MEMBER_IMPORT_HEADERS)[number];

export type ParsedMemberImportRow = {
  excelRow: number;
  values: Record<MemberImportHeader, string>;
};

export type ParsedMemberImportWorkbook = {
  sheetName: string;
  headerRow: number;
  headers: string[];
  rows: ParsedMemberImportRow[];
};

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[])
        .map((t) => t.text ?? "")
        .join("");
    }
    if ("text" in o) return String(o.text ?? "");
    if ("result" in o) return cellText(o.result);
    if ("formula" in o) return cellText(o.result ?? "");
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel serial date heuristic
    if (v > 20000 && v < 80000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const dt = new Date(epoch.getTime() + Math.round(v) * 86400000);
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    }
    return String(v);
  }
  let s = String(v).trim();
  if (s === '""') s = "";
  return s;
}

function rowCells(
  row: ExcelJS.Row,
  colCount: number,
): string[] {
  const out: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    out.push(cellText(row.getCell(c).value));
  }
  return out;
}

function scoreHeaderRow(cells: string[]): number {
  let hit = 0;
  const set = new Set(cells.filter(Boolean));
  for (const h of MEMBER_IMPORT_HEADERS) {
    if (set.has(h)) hit += 1;
  }
  return hit;
}

export async function parseMemberImportWorkbook(
  buffer: ArrayBuffer | Buffer,
): Promise<ParsedMemberImportWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ExcelJS.Buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) {
    throw new Error("워크시트가 비어 있습니다.");
  }

  const colCount = Math.max(sheet.actualColumnCount || 23, 23);
  let headerRow = 2;
  let bestScore = -1;
  const scanTo = Math.min(10, sheet.rowCount || 10);
  for (let r = 1; r <= scanTo; r++) {
    const score = scoreHeaderRow(rowCells(sheet.getRow(r), colCount));
    if (score > bestScore) {
      bestScore = score;
      headerRow = r;
    }
  }
  if (bestScore < 15) {
    throw new Error(
      `회원 Excel 헤더(23열)를 찾을 수 없습니다. 감지 점수=${bestScore}`,
    );
  }

  const headerCells = rowCells(sheet.getRow(headerRow), colCount);
  const headers = headerCells.slice(0, 23);
  const indexByHeader = new Map<string, number>();
  headers.forEach((h, i) => {
    if (h) indexByHeader.set(h, i);
  });
  for (const required of ["회원명", "연락처", "회원권"] as const) {
    if (!indexByHeader.has(required)) {
      throw new Error(`필수 컬럼 없음: ${required}`);
    }
  }

  const rows: ParsedMemberImportRow[] = [];
  for (let r = headerRow + 1; r <= (sheet.rowCount || 0); r++) {
    const cells = rowCells(sheet.getRow(r), colCount);
    const values = {} as Record<MemberImportHeader, string>;
    let any = false;
    for (const h of MEMBER_IMPORT_HEADERS) {
      const idx = indexByHeader.get(h);
      const v = idx == null ? "" : (cells[idx] ?? "");
      values[h] = v;
      if (v) any = true;
    }
    if (!any) continue;
    if (!values["회원명"] && !values["연락처"]) continue;
    rows.push({ excelRow: r, values });
  }

  return {
    sheetName: sheet.name,
    headerRow,
    headers,
    rows,
  };
}

export function parseImportAmount(raw: string): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function parseImportDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (m) {
    return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  }
  return null;
}
