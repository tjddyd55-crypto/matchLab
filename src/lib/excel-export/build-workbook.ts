import ExcelJS from "exceljs";
import type { ExcelExportField } from "@/lib/excel-export/types";

export async function buildExcelWorkbook<TRow>(input: {
  sheetName: string;
  fields: ReadonlyArray<ExcelExportField<string, TRow>>;
  rows: readonly TRow[];
}): Promise<Buffer> {
  const { sheetName, fields, rows } = input;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MATCHON";
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = fields.map((f) => ({
    header: f.label,
    key: f.key,
    width:
      f.width ?? Math.min(28, Math.max(12, f.label.length + 4)),
  }));

  rows.forEach((row, index) => {
    const values = fields.map((f) => f.extract(row, index + 1));
    const excelRow = sheet.addRow(values);
    fields.forEach((field, colIdx) => {
      if (!field.textFormat) return;
      const cell = excelRow.getCell(colIdx + 1);
      cell.numFmt = "@";
      const value = values[colIdx];
      if (typeof value === "string") {
        cell.value = value;
      }
    });
  });

  sheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
