import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_HEADERS,
  APPLICANT_EXCEL_MAX_ROWS,
  APPLICANT_EXCEL_REQUIRED_HEADERS,
  APPLICANT_EXCEL_SHEET_DATA,
  type ApplicantExcelHeader,
} from "@/lib/applicant-excel/columns";

export type ParsedApplicantExcelRow = {
  excelRow: number;
  values: Record<ApplicantExcelHeader, string>;
};

export type ParsedApplicantExcelWorkbook = {
  sheetName: string;
  headerRow: number;
  headers: string[];
  rows: ParsedApplicantExcelRow[];
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
    if (v > 20000 && v < 80000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const dt = new Date(epoch.getTime() + Math.round(v) * 86400000);
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    }
    return String(v);
  }
  return String(v).trim();
}

function rowCells(row: ExcelJS.Row, colCount: number): string[] {
  const out: string[] = [];
  for (let c = 1; c <= colCount; c += 1) {
    out.push(cellText(row.getCell(c).value));
  }
  return out;
}

function scoreHeaderRow(cells: string[]): number {
  const set = new Set(cells.map((c) => c.trim()).filter(Boolean));
  let hit = 0;
  for (const h of APPLICANT_EXCEL_HEADERS) {
    if (set.has(h)) hit += 1;
  }
  return hit;
}

function mapHeaderIndex(cells: string[]): Map<ApplicantExcelHeader, number> {
  const map = new Map<ApplicantExcelHeader, number>();
  cells.forEach((cell, idx) => {
    const name = cell.trim() as ApplicantExcelHeader;
    if ((APPLICANT_EXCEL_HEADERS as readonly string[]).includes(name)) {
      map.set(name, idx);
    }
  });
  return map;
}

export async function parseApplicantExcelWorkbook(
  buffer: ArrayBuffer | Buffer,
): Promise<ParsedApplicantExcelWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
  const sheet =
    wb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA) ?? wb.worksheets[0];
  if (!sheet) {
    throw new Error("워크시트가 비어 있습니다.");
  }

  const colCount = Math.max(
    sheet.actualColumnCount || APPLICANT_EXCEL_HEADERS.length,
    APPLICANT_EXCEL_HEADERS.length,
  );
  let headerRow = 1;
  let bestScore = -1;
  const scanTo = Math.min(8, sheet.rowCount || 8);
  for (let r = 1; r <= scanTo; r += 1) {
    const score = scoreHeaderRow(rowCells(sheet.getRow(r), colCount));
    if (score > bestScore) {
      bestScore = score;
      headerRow = r;
    }
  }
  if (bestScore < APPLICANT_EXCEL_REQUIRED_HEADERS.length) {
    throw new Error(
      "필수 컬럼(선수명, 성별, 생년월일, 체육관명, 경기구분, 체급)을 찾지 못했습니다.",
    );
  }

  const headerCells = rowCells(sheet.getRow(headerRow), colCount);
  const index = mapHeaderIndex(headerCells);
  for (const required of APPLICANT_EXCEL_REQUIRED_HEADERS) {
    if (!index.has(required)) {
      throw new Error(`필수 컬럼이 없습니다: ${required}`);
    }
  }

  const rows: ParsedApplicantExcelRow[] = [];
  for (let r = headerRow + 1; r <= (sheet.rowCount || headerRow); r += 1) {
    const cells = rowCells(sheet.getRow(r), colCount);
    const values = {} as Record<ApplicantExcelHeader, string>;
    let empty = true;
    for (const h of APPLICANT_EXCEL_HEADERS) {
      const i = index.get(h);
      const v = i == null ? "" : (cells[i] ?? "").trim();
      values[h] = v;
      if (v) empty = false;
    }
    if (empty) continue;
    rows.push({ excelRow: r, values });
    if (rows.length > APPLICANT_EXCEL_MAX_ROWS) {
      throw new Error(
        `한 번에 최대 ${APPLICANT_EXCEL_MAX_ROWS}명까지 등록할 수 있습니다.`,
      );
    }
  }

  return {
    sheetName: sheet.name,
    headerRow,
    headers: headerCells,
    rows,
  };
}
