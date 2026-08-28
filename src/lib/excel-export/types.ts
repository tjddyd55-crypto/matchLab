/** 선택형 Excel export field registry 항목 */
export type ExcelExportField<
  TKey extends string = string,
  TRow = unknown,
> = {
  key: TKey;
  /** 해당 관리 UI와 동일한 표시명 */
  label: string;
  defaultSelected: boolean;
  extract: (row: TRow, sequence: number) => string;
  /** 연락처 등 Excel text 포맷 */
  textFormat?: boolean;
  width?: number;
};

export type SelectableExcelExportFieldOption = {
  key: string;
  label: string;
  defaultSelected: boolean;
};
