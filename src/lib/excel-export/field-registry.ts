import type { ExcelExportField } from "@/lib/excel-export/types";

export function resolveExcelExportFields<
  TKey extends string,
  TRow,
>(
  registry: ReadonlyArray<ExcelExportField<TKey, TRow>>,
  selectedKeys: readonly string[],
): ExcelExportField<TKey, TRow>[] {
  const selected = new Set(selectedKeys);
  return registry.filter((f) => selected.has(f.key));
}

export function defaultExcelExportFieldKeys<
  TKey extends string,
  TRow,
>(registry: ReadonlyArray<ExcelExportField<TKey, TRow>>): TKey[] {
  return registry.filter((f) => f.defaultSelected).map((f) => f.key);
}
