import ExcelJS from "exceljs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveApplicantExcelHeader } from "../src/lib/applicant-excel/columns";
import { parseApplicantExcelWorkbook } from "../src/lib/applicant-excel/parse";

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

async function main() {
  const path = join(process.cwd(), "dev", "2026_9_5 마포구청장배 선수.xlsx");
  const buf = readFileSync(path);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as never);

  const sheets = wb.worksheets.map((s) => ({
    name: s.name,
    rows: s.rowCount,
    cols: s.actualColumnCount,
  }));
  const sheet = wb.worksheets[0]!;
  const headers: { i: number; v: string; resolved: string | null }[] = [];
  const colCount = Math.max(sheet.actualColumnCount || 11, 11);
  for (let i = 1; i <= colCount; i += 1) {
    const v = cellText(sheet.getRow(1).getCell(i).value);
    if (!v && i > 11) continue;
    headers.push({ i, v, resolved: resolveApplicantExcelHeader(v) });
  }

  let dataRows = 0;
  const sample: { excelRow: number; cells: string[] }[] = [];
  for (let r = 2; r <= (sheet.rowCount || 2); r += 1) {
    const cells: string[] = [];
    let empty = true;
    for (let c = 1; c <= colCount; c += 1) {
      const t = cellText(sheet.getRow(r).getCell(c).value);
      cells.push(t);
      if (t) empty = false;
    }
    if (empty) continue;
    dataRows += 1;
    if (sample.length < 5) sample.push({ excelRow: r, cells });
  }

  let parseError: string | null = null;
  let parsedRows = 0;
  let skippedExampleRows: number | null = null;
  try {
    const parsed = await parseApplicantExcelWorkbook(buf);
    parsedRows = parsed.rows.length;
    skippedExampleRows = parsed.skippedExampleRows;
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
  }

  const required = [
    "선수명",
    "성별",
    "생년월일",
    "체육관명",
    "경기구분",
    "체급",
  ] as const;
  const requiredMissing = required.filter(
    (h) => !headers.some((m) => m.resolved === h),
  );
  const aliasHits = headers.filter((m) => m.resolved && m.v !== m.resolved);

  const out = {
    path,
    sheets,
    headers,
    dataRows,
    sample,
    parseError,
    parsedRows,
    skippedExampleRows,
    requiredMissing,
    aliasHits,
    importReady: !parseError && requiredMissing.length === 0,
  };

  const outDir = join(process.cwd(), "test-results", "operational-roster-audit");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "report.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
