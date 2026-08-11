/**
 * 체급표 Excel 샘플 생성 / 파서 / Preview 분석.
 * DB migration 없이 DivisionTemplateItemInput[] 로 변환한다.
 */
import ExcelJS from "exceljs";
import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import {
  DIVISION_TEMPLATE_AGE_GROUPS,
  DIVISION_TEMPLATE_GENDER_LABELS,
  type DivisionTemplateGender,
  type DivisionTemplateLimitType,
} from "@/lib/division-template/division-template-constants";
import {
  formatWeightLimitText,
  type WeightLimitOperator,
} from "@/lib/division-template/division-template-parse";
import {
  buildWeightClassDisplay,
  normalizeTemplateItemWeight,
} from "@/lib/division-template/division-template-row";
import { getKickboxingWeightClassFixtureSeeds } from "@/lib/division-template/kickboxing-weight-classes.fixture";

export const WEIGHT_CLASS_EXCEL_HEADERS = [
  "부문",
  "성별",
  "체급명",
  "체중",
  "기준",
  "정렬순서",
] as const;

export type WeightClassExcelHeader = (typeof WEIGHT_CLASS_EXCEL_HEADERS)[number];

export type WeightClassImportDecision =
  | "create"
  | "skip_existing"
  | "error"
  | "conflict";

export type WeightClassImportPreviewRow = {
  excelRow: number;
  ageGroup: string;
  gender: DivisionTemplateGender | null;
  genderLabel: string;
  weightClassName: string;
  weightKg: number | null;
  operator: WeightLimitOperator | null;
  operatorLabel: string;
  sortOrder: number | null;
  weightLimitText: string | null;
  decision: WeightClassImportDecision;
  decisionLabel: string;
  errors: string[];
  item: DivisionTemplateItemInput | null;
};

export type WeightClassImportPreview = {
  fileName: string;
  headerRow: number;
  totalRows: number;
  counts: {
    create: number;
    skipExisting: number;
    error: number;
    conflict: number;
  };
  sectionCounts: Record<string, { male: number; female: number }>;
  rows: WeightClassImportPreviewRow[];
};

const GENDER_LABEL_TO_CODE: Record<string, DivisionTemplateGender> = {
  남성: "male",
  남자: "male",
  male: "male",
  여성: "female",
  여자: "female",
  female: "female",
};

const OPERATOR_LABEL_TO_CODE: Record<string, WeightLimitOperator> = {
  이하: "under",
  상한: "under",
  under: "under",
  max: "under",
  "-": "under",
  초과: "over",
  이상: "over",
  over: "over",
  "+": "over",
};

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[])
        .map((t) => t.text ?? "")
        .join("")
        .trim();
    }
    if ("text" in o) return String(o.text ?? "").trim();
    if ("result" in o) return cellText(o.result);
  }
  return String(v).trim();
}

function normalizeHeader(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

function findHeaderRow(
  sheet: ExcelJS.Worksheet,
): { rowNumber: number; colMap: Record<WeightClassExcelHeader, number> } | null {
  const needed = WEIGHT_CLASS_EXCEL_HEADERS.map(normalizeHeader);
  for (let r = 1; r <= Math.min(10, sheet.rowCount || 10); r++) {
    const row = sheet.getRow(r);
    const colMap = {} as Record<WeightClassExcelHeader, number>;
    let hits = 0;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const t = normalizeHeader(cellText(cell.value));
      const idx = needed.indexOf(t);
      if (idx >= 0) {
        colMap[WEIGHT_CLASS_EXCEL_HEADERS[idx]!] = col;
        hits += 1;
      }
    });
    if (hits >= WEIGHT_CLASS_EXCEL_HEADERS.length) {
      return { rowNumber: r, colMap };
    }
  }
  return null;
}

export function parseGenderLabel(raw: string): DivisionTemplateGender | null {
  const key = raw.trim().toLowerCase();
  return (
    GENDER_LABEL_TO_CODE[raw.trim()] ??
    GENDER_LABEL_TO_CODE[key] ??
    null
  );
}

export function parseOperatorLabel(raw: string): WeightLimitOperator | null {
  const key = raw.trim().toLowerCase();
  return (
    OPERATOR_LABEL_TO_CODE[raw.trim()] ??
    OPERATOR_LABEL_TO_CODE[key] ??
    null
  );
}

export function itemIdentityKey(item: {
  ageGroup?: string | null;
  gender?: string | null;
  weightClassName?: string | null;
  weightLimitText?: string | null;
}): string {
  return JSON.stringify({
    ageGroup: item.ageGroup?.trim() || "",
    gender: item.gender?.trim() || "",
    weightClassName: item.weightClassName?.trim() || "",
    weightLimitText: item.weightLimitText?.trim() || "",
  });
}

export async function buildWeightClassSampleWorkbook(
  options?: { includeKickboxingFixture?: boolean },
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MATCHON";
  const sheet = wb.addWorksheet("체급표 입력");
  sheet.addRow([...WEIGHT_CLASS_EXCEL_HEADERS]);
  sheet.getRow(1).font = { bold: true };

  if (options?.includeKickboxingFixture !== false) {
    for (const s of getKickboxingWeightClassFixtureSeeds()) {
      sheet.addRow([
        s.ageGroup,
        DIVISION_TEMPLATE_GENDER_LABELS[s.gender],
        s.weightClassName,
        s.kg,
        s.operator === "over" ? "초과" : "이하",
        s.sortOrder,
      ]);
    }
  } else {
    sheet.addRow(["초등부", "남성", "핀급", 30, "이하", 1]);
    sheet.addRow(["초등부", "남성", "헤비급", 55, "초과", 2]);
  }

  WEIGHT_CLASS_EXCEL_HEADERS.forEach((_, i) => {
    sheet.getColumn(i + 1).width = i === 2 ? 16 : 12;
  });

  const guide = wb.addWorksheet("입력 안내");
  guide.addRow(["MATCHON 체급표 업로드 안내"]);
  guide.addRow([]);
  guide.addRow(["컬럼", "설명", "허용 값 예시"]);
  guide.addRow(["부문", "연령/부문", DIVISION_TEMPLATE_AGE_GROUPS.join(" / ")]);
  guide.addRow(["성별", "성별 표시명", "남성 / 여성"]);
  guide.addRow(["체급명", "표시 이름 (부문·성별 내 중복 가능)", "핀급, 라이트웰터급"]);
  guide.addRow(["체중", "숫자 (소수 허용)", "30, 63.5"]);
  guide.addRow(["기준", "이하=상한 / 초과=무제한 하단", "이하 / 초과"]);
  guide.addRow(["정렬순서", "부문·성별 안 표시 순서 (1부터)", "1, 2, 3…"]);
  guide.addRow([]);
  guide.addRow([
    "주의",
    "파일 선택만으로 DB에 저장되지 않습니다. Preview 확인 후 확정하세요.",
    "",
  ]);
  guide.addRow([
    "중복",
    "동일 부문+성별+체급명+체중기준이면 기존과 동일로 건너뜁니다.",
    "",
  ]);
  guide.getColumn(1).width = 12;
  guide.getColumn(2).width = 48;
  guide.getColumn(3).width = 40;

  return wb;
}

export async function workbookToBuffer(
  wb: ExcelJS.Workbook,
): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function analyzeWeightClassWorkbook(input: {
  fileName: string;
  buffer: Buffer | ArrayBuffer | Uint8Array;
  sportType: string;
  existingItems: DivisionTemplateItemInput[];
}): Promise<WeightClassImportPreview> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(input.buffer as never);
  const sheet =
    wb.worksheets.find((s) => /체급|입력|weight/i.test(s.name)) ??
    wb.worksheets[0];
  if (!sheet) {
    return {
      fileName: input.fileName,
      headerRow: 0,
      totalRows: 0,
      counts: { create: 0, skipExisting: 0, error: 1, conflict: 0 },
      sectionCounts: {},
      rows: [
        {
          excelRow: 1,
          ageGroup: "",
          gender: null,
          genderLabel: "",
          weightClassName: "",
          weightKg: null,
          operator: null,
          operatorLabel: "",
          sortOrder: null,
          weightLimitText: null,
          decision: "error",
          decisionLabel: "오류",
          errors: ["시트를 찾을 수 없습니다."],
          item: null,
        },
      ],
    };
  }

  const header = findHeaderRow(sheet);
  if (!header) {
    return {
      fileName: input.fileName,
      headerRow: 0,
      totalRows: 0,
      counts: { create: 0, skipExisting: 0, error: 1, conflict: 0 },
      sectionCounts: {},
      rows: [
        {
          excelRow: 1,
          ageGroup: "",
          gender: null,
          genderLabel: "",
          weightClassName: "",
          weightKg: null,
          operator: null,
          operatorLabel: "",
          sortOrder: null,
          weightLimitText: null,
          decision: "error",
          decisionLabel: "오류",
          errors: [
            `헤더 행을 찾지 못했습니다. 필요 컬럼: ${WEIGHT_CLASS_EXCEL_HEADERS.join(", ")}`,
          ],
          item: null,
        },
      ],
    };
  }

  const existingKeys = new Set(
    input.existingItems
      .filter((i) => i.isActive !== false)
      .map((i) => itemIdentityKey(normalizeTemplateItemWeight(i))),
  );

  const fileKeys = new Map<string, number>();
  const rows: WeightClassImportPreviewRow[] = [];
  const sportType = input.sportType.trim() || "custom";

  for (let r = header.rowNumber + 1; r <= (sheet.rowCount || 0); r++) {
    const row = sheet.getRow(r);
    const get = (h: WeightClassExcelHeader) =>
      cellText(row.getCell(header.colMap[h]).value);

    const ageGroup = get("부문");
    const genderLabel = get("성별");
    const weightClassName = get("체급명");
    const weightRaw = get("체중");
    const operatorLabel = get("기준");
    const sortRaw = get("정렬순서");

    if (
      !ageGroup &&
      !genderLabel &&
      !weightClassName &&
      !weightRaw &&
      !operatorLabel &&
      !sortRaw
    ) {
      continue;
    }

    const errors: string[] = [];
    const gender = parseGenderLabel(genderLabel);
    const operator = parseOperatorLabel(operatorLabel);
    const weightKg = Number.parseFloat(weightRaw.replace(/,/g, ""));
    const sortOrder = Number.parseInt(sortRaw, 10);

    if (!ageGroup) errors.push("부문 없음");
    if (!gender) errors.push("성별 없음 또는 알 수 없음");
    if (!weightClassName) errors.push("체급명 없음");
    if (!weightRaw || !Number.isFinite(weightKg) || weightKg <= 0) {
      errors.push("체중 숫자 오류");
    }
    if (!operator) errors.push("기준값 알 수 없음");
    if (!sortRaw || !Number.isFinite(sortOrder) || sortOrder < 1) {
      errors.push("정렬순서 오류");
    }

    let item: DivisionTemplateItemInput | null = null;
    let weightLimitText: string | null = null;
    if (errors.length === 0 && gender && operator && Number.isFinite(weightKg)) {
      weightLimitText = formatWeightLimitText(weightKg, operator);
      const limitType: DivisionTemplateLimitType =
        operator === "over" ? "over" : "under";
      item = normalizeTemplateItemWeight({
        sportType,
        ruleType: null,
        gender,
        ageGroup,
        weightClassName,
        weightLimitText,
        weightLimitKg: weightKg,
        limitType,
        weightClass: null,
        skillLevel: null,
        displayOrder: sortOrder,
        isActive: true,
      });
    }

    let decision: WeightClassImportDecision = "create";
    let decisionLabel = "신규";

    if (errors.length) {
      decision = "error";
      decisionLabel = "오류";
    } else if (item) {
      const key = itemIdentityKey(item);
      const prev = fileKeys.get(key);
      if (prev != null) {
        decision = "error";
        decisionLabel = "오류";
        errors.push(`Excel 내 중복 (행 ${prev})`);
      } else {
        fileKeys.set(key, r);
        if (existingKeys.has(key)) {
          decision = "skip_existing";
          decisionLabel = "이미 존재";
        }
      }
    }

    // soft conflict: same age+gender+name but different limit
    if (decision === "create" && item) {
      const nameClash = input.existingItems.find(
        (ex) =>
          ex.isActive !== false &&
          (ex.ageGroup?.trim() || "") === (item!.ageGroup?.trim() || "") &&
          (ex.gender?.trim() || "") === (item!.gender?.trim() || "") &&
          (ex.weightClassName?.trim() || "") ===
            (item!.weightClassName?.trim() || "") &&
          (ex.weightLimitText?.trim() || "") !==
            (item!.weightLimitText?.trim() || ""),
      );
      if (nameClash) {
        decision = "conflict";
        decisionLabel = "충돌";
        errors.push(
          `동일 부문·성별·체급명에 다른 체중기준이 이미 있습니다 (${nameClash.weightLimitText ?? ""})`,
        );
      }
    }

    rows.push({
      excelRow: r,
      ageGroup,
      gender,
      genderLabel:
        gender != null ? DIVISION_TEMPLATE_GENDER_LABELS[gender] : genderLabel,
      weightClassName,
      weightKg: Number.isFinite(weightKg) ? weightKg : null,
      operator,
      operatorLabel: operator === "over" ? "초과" : operator === "under" ? "이하" : operatorLabel,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : null,
      weightLimitText,
      decision,
      decisionLabel,
      errors,
      item,
    });
  }

  // section order warnings: over class should be last within age+gender
  const bySection = new Map<string, WeightClassImportPreviewRow[]>();
  for (const row of rows) {
    if (row.decision === "error" || !row.gender) continue;
    const key = `${row.ageGroup}|${row.gender}`;
    const list = bySection.get(key) ?? [];
    list.push(row);
    bySection.set(key, list);
  }
  for (const list of bySection.values()) {
    const ordered = [...list].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    const overIdx = ordered.findIndex((r) => r.operator === "over");
    if (overIdx >= 0 && overIdx < ordered.length - 1) {
      const overRow = ordered[overIdx]!;
      overRow.errors.push("초과 기준 뒤에 다른 체급이 있습니다");
      if (overRow.decision === "create") {
        overRow.decision = "error";
        overRow.decisionLabel = "오류";
      }
    }
    // under weight should be non-decreasing by sort
    let prevUnder: number | null = null;
    for (const r of ordered) {
      if (r.operator !== "under" || r.weightKg == null) continue;
      if (prevUnder != null && r.weightKg < prevUnder) {
        r.errors.push("상한 체중 순서가 역전되었습니다");
        if (r.decision === "create") {
          r.decision = "error";
          r.decisionLabel = "오류";
        }
      }
      prevUnder = r.weightKg;
    }
  }

  const counts = { create: 0, skipExisting: 0, error: 0, conflict: 0 };
  const sectionCounts: Record<string, { male: number; female: number }> = {};
  for (const row of rows) {
    if (row.decision === "create") counts.create += 1;
    else if (row.decision === "skip_existing") counts.skipExisting += 1;
    else if (row.decision === "conflict") counts.conflict += 1;
    else counts.error += 1;

    if (row.gender && row.ageGroup) {
      const sc = sectionCounts[row.ageGroup] ?? { male: 0, female: 0 };
      if (row.decision !== "error") {
        sc[row.gender] += 1;
      }
      sectionCounts[row.ageGroup] = sc;
    }
  }

  return {
    fileName: input.fileName,
    headerRow: header.rowNumber,
    totalRows: rows.length,
    counts,
    sectionCounts,
    rows,
  };
}

/** Preview 확정 → 기존 items에 create만 append (skip/conflict/error 제외) */
export function mergeWeightClassImportIntoItems(input: {
  existingItems: DivisionTemplateItemInput[];
  preview: WeightClassImportPreview;
}): DivisionTemplateItemInput[] {
  const next = input.existingItems
    .filter((i) => i.isActive !== false)
    .map((i) => normalizeTemplateItemWeight(i));

  const existingKeys = new Set(next.map((i) => itemIdentityKey(i)));

  for (const row of input.preview.rows) {
    if (row.decision !== "create" || !row.item) continue;
    const key = itemIdentityKey(row.item);
    if (existingKeys.has(key)) continue;
    next.push(normalizeTemplateItemWeight(row.item));
    existingKeys.add(key);
  }

  return next.map((item, idx) => ({
    ...item,
    displayOrder: item.displayOrder ?? idx,
    weightClass: buildWeightClassDisplay(item) || item.weightClass,
  }));
}
