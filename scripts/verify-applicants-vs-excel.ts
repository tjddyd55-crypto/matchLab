/**
 * 엑셀 신청자 vs 시스템 EventApplication 비교 (read-only)
 *
 *   npx tsx scripts/verify-applicants-vs-excel.ts --event-id <id> --excel <path>
 *   npx tsx scripts/verify-applicants-vs-excel.ts --excel-only --excel <path>
 *   npx tsx scripts/verify-applicants-vs-excel.ts --production --event-id <id> --excel <path>
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
  APPLICANT_EXCEL_SHEET_DATA,
} from "../src/lib/applicant-excel/columns";
import { compactText, foldKey } from "../src/lib/applicant-excel/normalize";
import { parseApplicantNameFromSnapshot } from "../src/lib/brackets/bracket-print-format";
import { formatSchoolGradeCompactLabel } from "../src/lib/fighter/record";
import { resolveApplicationGymDisplayName } from "../src/lib/gym/external-registration-placeholder-gym";

type ExcelRow = {
  rowNumber: number;
  gymName: string;
  fighterName: string;
  gender: string | null;
  birthDate: string | null;
  weightKg: string | null;
  record: string | null;
  division: string | null;
  sport: string | null;
};

type SystemRow = {
  applicationId: string;
  status: string;
  gymName: string;
  fighterName: string;
  gender: string | null;
  birthDate: string | null;
  weightKg: number | null;
  record: string | null;
  divisionLabel: string | null;
  appliedAt: string | null;
};

type DbFingerprint = {
  host: string;
  port: string;
  database: string;
};

function parseArgs(argv: string[]) {
  let eventId = "";
  let excelPath = "";
  let excelOnly = false;
  let production = false;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--event-id") eventId = argv[++i] ?? "";
    else if (arg === "--excel") excelPath = argv[++i] ?? "";
    else if (arg === "--excel-only") excelOnly = true;
    else if (arg === "--production") production = true;
  }
  return { eventId, excelPath, excelOnly, production };
}

function parseDatabaseFingerprint(databaseUrl: string): DbFingerprint {
  const hostMatch = databaseUrl.match(/@([^/:]+)(?::(\d+))?\/([^?]+)/);
  return {
    host: hostMatch?.[1] ?? "unknown",
    port: hostMatch?.[2] ?? "default",
    database: hostMatch?.[3] ?? "unknown",
  };
}

function assertProductionDatabase(databaseUrl: string): DbFingerprint {
  const fp = parseDatabaseFingerprint(databaseUrl);
  if (/yamanote/i.test(databaseUrl)) {
    throw new Error(
      `REFUSING: Development yamanote DB detected (${fp.host}:${fp.port})`,
    );
  }
  if (!/yamabiko/i.test(databaseUrl)) {
    throw new Error(
      `REFUSING: expected Production yamabiko DB, got ${fp.host}:${fp.port}`,
    );
  }
  return fp;
}

function resolveProductionDatabaseUrl(): string {
  const raw = execSync("railway variable list -e production -s Postgres --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, "");
  const vars = JSON.parse(raw) as Record<string, string>;
  const databaseUrl = vars.DATABASE_PUBLIC_URL ?? vars.DATABASE_URL ?? "";
  assert.ok(databaseUrl, "Production DATABASE_URL not found via railway CLI");
  return databaseUrl;
}

function compareKey(gymName: string, fighterName: string): string {
  return `${foldKey(gymName)}::${foldKey(fighterName)}`;
}

function nameKey(fighterName: string): string {
  return foldKey(fighterName);
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return compactText(String(value));
  }
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("text" in obj && typeof obj.text === "string") {
      return compactText(obj.text);
    }
    if ("richText" in obj && Array.isArray(obj.richText)) {
      const joined = (obj.richText as Array<{ text?: string }>)
        .map((part) => part.text ?? "")
        .join("");
      return compactText(joined);
    }
    if ("result" in obj) {
      return cellText(obj.result as ExcelJS.CellValue);
    }
    if ("hyperlink" in obj && typeof obj.text === "string") {
      return compactText(obj.text);
    }
    if ("formula" in obj && "result" in obj) {
      return cellText(obj.result as ExcelJS.CellValue);
    }
  }
  return compactText(String(value));
}

async function readExcelWorkbook(filePath: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(readFileSync(filePath) as never);
  return wb;
}

async function readExcelRows(filePath: string): Promise<{
  sheetNames: string[];
  rows: ExcelRow[];
  rawRows: number;
  exampleRowsExcluded: number;
}> {
  const wb = await readExcelWorkbook(filePath);
  const sheetNames = wb.worksheets.map((s) => s.name);
  const sheet = wb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  if (!sheet) {
    throw new Error(
      `시트 "${APPLICANT_EXCEL_SHEET_DATA}"를 찾을 수 없습니다. sheets=${sheetNames.join(", ")}`,
    );
  }

  const headerRow = sheet.getRow(1);
  const colIndex = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const header = cellText(cell.value);
    if (header) colIndex.set(header, col);
  });

  const gymCol = colIndex.get("체육관명");
  const nameCol = colIndex.get("선수명");
  const genderCol = colIndex.get("성별");
  const birthCol = colIndex.get("생년월일");
  const weightCol = colIndex.get("신청체중");
  const recordCol = colIndex.get("전적") ?? colIndex.get("총전");
  const divisionCol = colIndex.get("경기구분");
  const sportCol = colIndex.get("종목");
  const numberCol = colIndex.get("번호");

  if (!gymCol || !nameCol) {
    throw new Error("필수 컬럼(체육관명, 선수명)이 없습니다.");
  }

  const rows: ExcelRow[] = [];
  let rawRows = 0;
  let exampleRowsExcluded = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    rawRows++;
    const numberLabel = numberCol ? cellText(row.getCell(numberCol).value) : "";
    if (numberLabel === APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL) {
      exampleRowsExcluded++;
      return;
    }

    const fighterName = cellText(row.getCell(nameCol).value);
    const gymName = cellText(row.getCell(gymCol).value);
    if (!fighterName) return;

    rows.push({
      rowNumber,
      gymName,
      fighterName,
      gender: genderCol ? cellText(row.getCell(genderCol).value) || null : null,
      birthDate: birthCol ? cellText(row.getCell(birthCol).value) || null : null,
      weightKg: weightCol ? cellText(row.getCell(weightCol).value) || null : null,
      record: recordCol ? cellText(row.getCell(recordCol).value) || null : null,
      division: divisionCol
        ? cellText(row.getCell(divisionCol).value) || null
        : null,
      sport: sportCol ? cellText(row.getCell(sportCol).value) || null : null,
    });
  });

  return { sheetNames, rows, rawRows, exampleRowsExcluded };
}

function parseWeightFromSnapshot(fighterSnapshot: unknown): number | null {
  if (!fighterSnapshot || typeof fighterSnapshot !== "object") return null;
  const raw = (fighterSnapshot as Record<string, unknown>).applicationWeightKg;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatSystemDivisionLabel(app: {
  division: {
    ageGroup: string | null;
    gender: string | null;
    sportType: string | null;
    weightClassName: string | null;
    weightLimitText: string | null;
  } | null;
  schoolLevelSnapshot: string | null;
  schoolGradeSnapshot: number | null;
}): string | null {
  const grade = formatSchoolGradeCompactLabel({
    schoolLevel: app.schoolLevelSnapshot,
    schoolGrade: app.schoolGradeSnapshot,
  });
  if (grade) return grade;
  if (!app.division) return null;
  const parts = [
    app.division.ageGroup,
    app.division.gender === "male"
      ? "남"
      : app.division.gender === "female"
        ? "여"
        : null,
    app.division.sportType,
    app.division.weightClassName,
    app.division.weightLimitText,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

async function readSystemRows(eventId: string): Promise<SystemRow[]> {
  const { prisma } = await import("../src/lib/prisma");
  const apps = await prisma.eventApplication.findMany({
    where: { eventId },
    select: {
      id: true,
      status: true,
      appliedAt: true,
      fighterSnapshot: true,
      gymNameSnapshot: true,
      gymSnapshot: true,
      recordText: true,
      schoolLevelSnapshot: true,
      schoolGradeSnapshot: true,
      fighter: {
        select: { name: true, birthDate: true, gender: true },
      },
      gym: { select: { name: true } },
      division: {
        select: {
          ageGroup: true,
          gender: true,
          sportType: true,
          weightClassName: true,
          weightLimitText: true,
        },
      },
    },
    orderBy: [{ appliedAt: "asc" }, { id: "asc" }],
  });

  return apps.map((app) => {
    const fighterName =
      parseApplicantNameFromSnapshot(app.fighterSnapshot) ||
      app.fighter.name?.trim() ||
      "";
    const gymName = resolveApplicationGymDisplayName({
      gymNameSnapshot: app.gymNameSnapshot,
      gymSnapshot: app.gymSnapshot,
      gymRelationName: app.gym?.name ?? null,
    });
    return {
      applicationId: app.id,
      status: app.status,
      gymName,
      fighterName,
      gender: app.fighter.gender ?? null,
      birthDate: app.fighter.birthDate
        ? app.fighter.birthDate.toISOString().slice(0, 10)
        : null,
      weightKg: parseWeightFromSnapshot(app.fighterSnapshot),
      record: app.recordText?.trim() || null,
      divisionLabel: formatSystemDivisionLabel(app),
      appliedAt: app.appliedAt?.toISOString() ?? null,
    };
  });
}

function findDuplicates<T extends { gymName: string; fighterName: string }>(
  rows: T[],
): Array<{ key: string; count: number; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = compareKey(row.gymName, row.fighterName);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, count: items.length, items }));
}

function compareSets(
  excelRows: ExcelRow[],
  systemRows: SystemRow[],
) {
  const excelByKey = new Map(excelRows.map((r) => [compareKey(r.gymName, r.fighterName), r]));
  const systemByKey = new Map(
    systemRows.map((r) => [compareKey(r.gymName, r.fighterName), r]),
  );

  const exact: Array<{ excel: ExcelRow; system: SystemRow }> = [];
  const excelOnly: ExcelRow[] = [];
  const systemOnly: SystemRow[] = [];
  const nameSameGymDifferent: Array<{
    excel: ExcelRow;
    system: SystemRow;
  }> = [];
  const possibleMismatch: Array<{
    excel: ExcelRow;
    system: SystemRow;
    reason: string;
  }> = [];

  for (const [key, excel] of excelByKey) {
    const system = systemByKey.get(key);
    if (system) {
      exact.push({ excel, system });
      continue;
    }

    const nameMatches = systemRows.filter(
      (s) => nameKey(s.fighterName) === nameKey(excel.fighterName),
    );
    if (nameMatches.length === 1) {
      const candidate = nameMatches[0]!;
      const reasons: string[] = [];
      if (excel.gender && candidate.gender && excel.gender !== candidate.gender) {
        reasons.push("성별 불일치");
      }
      if (
        excel.weightKg &&
        candidate.weightKg != null &&
        Math.abs(Number.parseFloat(excel.weightKg) - candidate.weightKg) > 0.5
      ) {
        reasons.push("체중 불일치");
      }
      if (reasons.length > 0) {
        possibleMismatch.push({
          excel,
          system: candidate,
          reason: reasons.join(", "),
        });
      } else {
        nameSameGymDifferent.push({ excel, system: candidate });
      }
      continue;
    }

    if (nameMatches.length > 1) {
      possibleMismatch.push({
        excel,
        system: nameMatches[0]!,
        reason: `동명이인 후보 ${nameMatches.length}명`,
      });
      continue;
    }

    excelOnly.push(excel);
  }

  for (const [key, system] of systemByKey) {
    if (!excelByKey.has(key)) {
      const alreadyLinked = nameSameGymDifferent.some(
        (x) => compareKey(x.system.gymName, x.system.fighterName) === key,
      );
      if (!alreadyLinked) systemOnly.push(system);
    }
  }

  return { exact, excelOnly, systemOnly, nameSameGymDifferent, possibleMismatch };
}

function countByStatus(rows: SystemRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return counts;
}

function printTable(headers: string[], rows: string[][]) {
  console.log(`| ${headers.join(" | ")} |`);
  console.log(`| ${headers.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    console.log(`| ${row.join(" | ")} |`);
  }
}

async function main() {
  const { eventId, excelPath: rawExcel, excelOnly, production } = parseArgs(
    process.argv,
  );
  assert.ok(rawExcel, "--excel 필요");

  const excelPath = resolve(rawExcel);
  const wbMeta = await readExcelRows(excelPath);
  console.log("\n[Excel workbook sheets]");
  for (const name of wbMeta.sheetNames) {
    console.log(`  - ${name}`);
  }
  assert.ok(
    wbMeta.sheetNames.includes(APPLICANT_EXCEL_SHEET_DATA),
    `missing sheet ${APPLICANT_EXCEL_SHEET_DATA}`,
  );

  if (excelOnly) {
    console.log(`\n[엑셀만 집계] ${excelPath}`);
    console.log(`raw rows: ${wbMeta.rawRows}`);
    console.log(`example rows excluded: ${wbMeta.exampleRowsExcluded}`);
    console.log(`actual players: ${wbMeta.rows.length}`);
    console.log(
      `unique gym+name: ${new Set(wbMeta.rows.map((r) => compareKey(r.gymName, r.fighterName))).size}`,
    );
    console.log("\nverify-applicants-vs-excel OK (excel-only)\n");
    return;
  }

  assert.ok(eventId, "--event-id 필요");

  let databaseUrl = process.env.DATABASE_URL ?? "";
  if (production || !databaseUrl) {
    databaseUrl = resolveProductionDatabaseUrl();
    process.env.DATABASE_URL = databaseUrl;
  }

  const fp = assertProductionDatabase(databaseUrl);
  console.log("\n[DB fingerprint]");
  console.log(`host: ${fp.host}`);
  console.log(`port: ${fp.port}`);
  console.log(`database: ${fp.database}`);
  console.log(`eventId: ${eventId}`);
  console.log("mode: READ ONLY");
  console.log("Production DB confirmed");

  const { prisma } = await import("../src/lib/prisma");
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });
  assert.ok(event, `event not found: ${eventId}`);

  const systemRows = await readSystemRows(eventId);
  const excelRows = wbMeta.rows;
  const excelDuplicates = findDuplicates(excelRows);
  const systemDuplicates = findDuplicates(systemRows);

  const allComparison = compareSets(excelRows, systemRows);
  const approvedRows = systemRows.filter((r) => r.status === "approved");
  const approvedComparison = compareSets(excelRows, approvedRows);

  const statusCounts = countByStatus(systemRows);
  const uniqueExcel = new Set(
    excelRows.map((r) => compareKey(r.gymName, r.fighterName)),
  ).size;
  const uniqueSystem = new Set(
    systemRows.map((r) => compareKey(r.gymName, r.fighterName)),
  ).size;

  const report = {
    generatedAt: new Date().toISOString(),
    db: { ...fp, eventId, readOnly: true },
    excel: {
      file: excelPath,
      sheet: APPLICANT_EXCEL_SHEET_DATA,
      rawRows: wbMeta.rawRows,
      exampleRowsExcluded: wbMeta.exampleRowsExcluded,
      actualPlayers: excelRows.length,
      uniqueGymName: uniqueExcel,
      duplicates: excelDuplicates,
    },
    system: {
      eventTitle: event.title,
      rows: systemRows.length,
      uniquePlayers: uniqueSystem,
      byStatus: Object.fromEntries(statusCounts),
    },
    comparisonAll: {
      exact: allComparison.exact.length,
      excelOnly: allComparison.excelOnly,
      systemOnly: allComparison.systemOnly,
      nameSameGymDifferent: allComparison.nameSameGymDifferent,
      possibleMismatch: allComparison.possibleMismatch,
    },
    comparisonApproved: {
      exact: approvedComparison.exact.length,
      excelNotApproved: approvedComparison.excelOnly.map((excel) => {
        const matches = systemRows.filter(
          (s) => nameKey(s.fighterName) === nameKey(excel.fighterName) &&
            compareKey(s.gymName, s.fighterName) ===
              compareKey(excel.gymName, excel.fighterName),
        );
        const fallback = systemRows.filter(
          (s) => compareKey(s.gymName, s.fighterName) === compareKey(excel.gymName, excel.fighterName),
        );
        const linked = matches[0] ?? fallback[0] ?? null;
        return { excel, systemStatus: linked?.status ?? null, applicationId: linked?.applicationId ?? null };
      }),
      approvedSystemOnly: approvedComparison.systemOnly,
    },
    excelDuplicates,
    systemDuplicates,
  };

  const outDir = join(process.cwd(), "tmp");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `application-compare-${eventId}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`\n## DB\n`);
  console.log(`* host: ${fp.host}`);
  console.log(`* port: ${fp.port}`);
  console.log(`* database: ${fp.database}`);
  console.log(`* eventId: ${eventId}`);
  console.log(`* read-only: YES`);

  console.log(`\n## Excel\n`);
  console.log(`* file: ${excelPath}`);
  console.log(`* sheet: ${APPLICANT_EXCEL_SHEET_DATA}`);
  console.log(`* raw rows: ${wbMeta.rawRows}`);
  console.log(`* example rows excluded: ${wbMeta.exampleRowsExcluded}`);
  console.log(`* actual players: ${excelRows.length}`);
  console.log(`* unique gym+name: ${uniqueExcel}`);
  console.log(`* duplicates: ${excelDuplicates.length}`);

  console.log(`\n## System\n`);
  console.log(`* EventApplication rows: ${systemRows.length}`);
  console.log(`* unique players: ${uniqueSystem}`);
  console.log(`* APPROVED: ${statusCounts.get("approved") ?? 0}`);
  console.log(`* PENDING: ${statusCounts.get("pending") ?? 0}`);
  console.log(`* REJECTED: ${statusCounts.get("rejected") ?? 0}`);
  const cancelled = statusCounts.get("cancelled") ?? 0;
  const known =
    (statusCounts.get("approved") ?? 0) +
    (statusCounts.get("pending") ?? 0) +
    (statusCounts.get("rejected") ?? 0) +
    cancelled;
  console.log(`* cancelled: ${cancelled}`);
  console.log(`* other: ${Math.max(0, systemRows.length - known)}`);

  console.log(`\n## Comparison — All statuses\n`);
  console.log(`* exact: ${allComparison.exact.length}`);
  console.log(`* excel only: ${allComparison.excelOnly.length}`);
  console.log(`* system only: ${allComparison.systemOnly.length}`);
  console.log(`* name same / gym different: ${allComparison.nameSameGymDifferent.length}`);
  console.log(`* possible mismatch: ${allComparison.possibleMismatch.length}`);

  if (allComparison.excelOnly.length > 0) {
    console.log(`\n### Excel only\n`);
    printTable(
      ["체육관", "선수명", "성별", "체중", "경기구분", "전적"],
      allComparison.excelOnly.map((r) => [
        r.gymName,
        r.fighterName,
        r.gender ?? "",
        r.weightKg ?? "",
        r.division ?? "",
        r.record ?? "",
      ]),
    );
  }

  if (allComparison.systemOnly.length > 0) {
    console.log(`\n### System only\n`);
    printTable(
      ["체육관", "선수명", "성별", "체중", "학년/경기구분", "상태", "applicationId"],
      allComparison.systemOnly.map((r) => [
        r.gymName,
        r.fighterName,
        r.gender ?? "",
        r.weightKg != null ? String(r.weightKg) : "",
        r.divisionLabel ?? "",
        r.status,
        r.applicationId,
      ]),
    );
  }

  console.log(`\n## Comparison — APPROVED only\n`);
  console.log(`* exact: ${approvedComparison.exact.length}`);
  console.log(`* excel not approved: ${approvedComparison.excelOnly.length}`);
  console.log(`* approved system only: ${approvedComparison.systemOnly.length}`);

  if (approvedComparison.excelOnly.length > 0) {
    console.log(`\n### Excel not approved (with system status if any)\n`);
    for (const excel of approvedComparison.excelOnly) {
      const key = compareKey(excel.gymName, excel.fighterName);
      const linked = systemRows.find(
        (s) => compareKey(s.gymName, s.fighterName) === key,
      );
      console.log(
        `  - ${excel.gymName} / ${excel.fighterName} → system status: ${linked?.status ?? "NOT FOUND"} (${linked?.applicationId ?? "-"})`,
      );
    }
  }

  console.log(`\n## Duplicates\n`);
  console.log(`### Excel duplicates: ${excelDuplicates.length}`);
  for (const dup of excelDuplicates) {
    console.log(`  ${dup.key} x${dup.count}`);
  }
  console.log(`### System duplicates: ${systemDuplicates.length}`);
  for (const dup of systemDuplicates) {
    const first = dup.items[0]!;
    console.log(
      `  ${first.fighterName} / ${first.gymName} x${dup.count}`,
    );
    for (const item of dup.items) {
      console.log(`    - ${item.applicationId} (${item.status})`);
    }
  }

  console.log(`\n## Final reconciliation\n`);
  console.log(`* Excel actual: ${excelRows.length}`);
  console.log(`* System total: ${systemRows.length}`);
  console.log(`* System unique: ${uniqueSystem}`);
  console.log(`* 실제 DB에서 완전히 누락된 선수 수: ${allComparison.excelOnly.length}`);
  console.log(
    `* 승인되지 않은 선수 수(엑셀 기준, APPROVED 아님): ${approvedComparison.excelOnly.length}`,
  );
  console.log(`* 시스템에만 존재하는 선수 수: ${allComparison.systemOnly.length}`);
  console.log(`\nSaved: ${outPath}`);
  console.log("\nverify-applicants-vs-excel OK (read-only)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const { prisma } = await import("../src/lib/prisma");
      await prisma.$disconnect();
    } catch {
      // excel-only / early failure
    }
  });
