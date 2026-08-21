import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_EXAMPLE_KIND,
  APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
  APPLICANT_EXCEL_HEADERS,
  APPLICANT_EXCEL_INTERNAL_KIND_HEADER,
  APPLICANT_EXCEL_MAX_ROWS,
  APPLICANT_EXCEL_OPTIONAL_HEADERS,
  APPLICANT_EXCEL_REQUIRED_HEADERS,
  APPLICANT_EXCEL_SHEET_DATA,
  resolveApplicantExcelHeader,
  type ApplicantExcelHeader,
} from "@/lib/applicant-excel/columns";
import { foldKey } from "@/lib/applicant-excel/normalize";

export type ParsedApplicantExcelRow = {
  excelRow: number;
  values: Record<ApplicantExcelHeader, string>;
  isSampleExample: boolean;
};

export type ParsedApplicantExcelWorkbook = {
  sheetName: string;
  headerRow: number;
  headers: string[];
  rows: ParsedApplicantExcelRow[];
  skippedExampleRows: number;
};

export function cellText(v: unknown): string {
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
  const set = new Set(
    cells
      .map((c) => resolveApplicantExcelHeader(c))
      .filter((h): h is ApplicantExcelHeader => Boolean(h)),
  );
  let hit = 0;
  for (const h of APPLICANT_EXCEL_HEADERS) {
    if (set.has(h)) hit += 1;
  }
  return hit;
}

function mapHeaderIndex(cells: string[]): {
  index: Map<ApplicantExcelHeader, number>;
  kindIndex: number | null;
} {
  const index = new Map<ApplicantExcelHeader, number>();
  let kindIndex: number | null = null;
  cells.forEach((cell, idx) => {
    const trimmed = cell.trim();
    if (trimmed === APPLICANT_EXCEL_INTERNAL_KIND_HEADER) {
      kindIndex = idx;
      return;
    }
    const resolved = resolveApplicantExcelHeader(trimmed);
    if (resolved && !index.has(resolved)) {
      index.set(resolved, idx);
    }
  });
  // 운영 파일처럼 1열 헤더가 비어 있고 순번만 있는 경우 → 번호로 안전 매핑
  if (!index.has("번호") && cells.length > 0 && !cells[0]?.trim()) {
    index.set("번호", 0);
  }
  return { index, kindIndex };
}

function isExampleRow(input: {
  kindValue: string;
  numberValue: string;
}): boolean {
  if (foldKey(input.kindValue) === foldKey(APPLICANT_EXCEL_EXAMPLE_KIND)) {
    return true;
  }
  return foldKey(input.numberValue) === foldKey(APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL);
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
      "필수 컬럼(체육관명, 선수명, 성별, 생년월일, 연락처, 경기구분, 체급, 총전/승/무/패)을 찾지 못했습니다.",
    );
  }

  const headerCells = rowCells(sheet.getRow(headerRow), colCount);
  const { index, kindIndex } = mapHeaderIndex(headerCells);
  const missingRequired = APPLICANT_EXCEL_REQUIRED_HEADERS.filter(
    (required) => !index.has(required),
  );
  if (missingRequired.length > 0) {
    throw new Error(`필수 컬럼이 없습니다: ${missingRequired.join(", ")}`);
  }

  const rows: ParsedApplicantExcelRow[] = [];
  let skippedExampleRows = 0;
  for (let r = headerRow + 1; r <= (sheet.rowCount || headerRow); r += 1) {
    const cells = rowCells(sheet.getRow(r), colCount);
    const values = {} as Record<ApplicantExcelHeader, string>;
    let empty = true;
    const allHeaders = [
      ...APPLICANT_EXCEL_HEADERS,
      ...APPLICANT_EXCEL_OPTIONAL_HEADERS,
    ];
    for (const h of allHeaders) {
      const i = index.get(h);
      const v = i == null ? "" : (cells[i] ?? "").trim();
      values[h] = v;
      if (v) empty = false;
    }
    if (empty) continue;

    const kindValue =
      kindIndex == null ? "" : (cells[kindIndex] ?? "").trim();
    const sampleExample = isExampleRow({
      kindValue,
      numberValue: values.번호 ?? "",
    });
    if (sampleExample) {
      skippedExampleRows += 1;
      continue;
    }

    rows.push({ excelRow: r, values, isSampleExample: false });
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
    skippedExampleRows,
  };
}
