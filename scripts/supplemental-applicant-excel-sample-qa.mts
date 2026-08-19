/**
 * Local supplemental checks after Preview E2E (no DB writes).
 *   npx tsx scripts/supplemental-applicant-excel-sample-qa.mts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Module from "node:module";
import ExcelJS from "exceljs";

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const OUT = join(process.cwd(), "test-results", "applicant-excel-sample-structure-qa");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { parseApplicantExcelWorkbook } = await import(
    "../src/lib/applicant-excel/parse"
  );
  const { analyzeApplicantExcelRows } = await import(
    "../src/lib/applicant-excel/analyze"
  );
  const {
    parseOptionalHeightCm,
    parseOptionalWeightKg,
    parseApplicantBirthDate,
    parseApplicantGender,
  } = await import("../src/lib/applicant-excel/normalize");

  const report: Record<string, string | number | boolean> = {};

  const { buildApplicantExcelSampleWorkbook } = await import(
    "../src/lib/applicant-excel/sample"
  );
  const built = await buildApplicantExcelSampleWorkbook({
    eventTitle: "QA Lookup",
    divisions: [
      {
        id: "1",
        sportType: "킥복싱",
        gender: "male",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
        weightClassName: "라이트급",
        weightLimitText: "-60kg",
      },
    ],
  });
  const builtPath = join(OUT, "sample-built-lookup.xlsx");
  await built.xlsx.writeFile(builtPath);
  let lookupHeader = "";
  let lookupTitle = "";
  built.getWorksheet("입력 안내")!.eachRow((row) => {
    const vals = (row.values as unknown[])
      .slice(1)
      .map((v) => String(v ?? "").trim());
    if (vals[0]?.includes("사용 가능")) lookupTitle = vals.join("|");
    if (vals[0] === "경기구분" && vals.includes("체중기준")) {
      lookupHeader = vals.join(",");
    }
  });
  report.lookupTitle = lookupTitle;
  report.lookupHeader = lookupHeader || "MISSING";

  const samplePath = join(OUT, "MATCHON_선수신청_업로드_샘플.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(samplePath);
  const data = wb.getWorksheet("선수 신청")!;
  const guide = wb.getWorksheet("입력 안내")!;
  const r3: string[] = [];
  for (let c = 1; c <= 18; c += 1) {
    r3.push(String(data.getRow(3).getCell(c).value ?? "").trim());
  }
  report.row3Blank = r3.every((v) => !v) ? "PASS" : r3.join("|");
  report.sheet2Name = guide.name;
  const guideText: string[] = [];
  guide.eachRow((row) => {
    guideText.push(
      (row.values as unknown[])
        .filter((v) => v != null && String(v).trim())
        .map(String)
        .join(" | "),
    );
  });
  const joined = guideText.join("\n");
  report.sheet2Required = ["체육관명", "선수명", "성별", "생년월일", "경기구분", "체급"].every(
    (k) => joined.includes(k),
  )
    ? "PASS"
    : "FAIL";
  report.sheet2Lookup =
    joined.includes("현재 대회") || joined.includes("사용 가능") ? "PASS" : "CHECK";
  report.sheet2HintHits = [
    "남 / 여",
    "2008-05-12",
    "175",
    "62.8",
    "체중기준",
  ].filter((k) => joined.includes(k)).length;

  report.exampleGym = String(data.getRow(2).getCell(2).value ?? "");
  report.exampleName = String(data.getRow(2).getCell(3).value ?? "");
  report.exampleGender = String(data.getRow(2).getCell(4).value ?? "");
  report.exampleBirth = String(data.getRow(2).getCell(5).value ?? "");
  report.exampleAge = String(data.getRow(2).getCell(6).value ?? "");
  report.exampleHeight = String(data.getRow(2).getCell(7).value ?? "");
  report.exampleWeight = String(data.getRow(2).getCell(8).value ?? "");
  report.exampleRecord = String(data.getRow(2).getCell(9).value ?? "");
  report.exampleCareer = String(data.getRow(2).getCell(10).value ?? "");
  report.exampleDivision = String(data.getRow(2).getCell(11).value ?? "");
  report.exampleClass = String(data.getRow(2).getCell(12).value ?? "");
  report.exampleLimit = String(data.getRow(2).getCell(13).value ?? "");
  report.exampleSport = String(data.getRow(2).getCell(14).value ?? "");
  report.examplePhone = String(data.getRow(2).getCell(15).value ?? "");
  report.exampleGuardian = String(data.getRow(2).getCell(16).value ?? "");
  report.exampleGPhone = String(data.getRow(2).getCell(17).value ?? "");
  report.exampleMemo = String(data.getRow(2).getCell(18).value ?? "");
  report.exampleKindHidden = String(data.getRow(2).getCell(19).value ?? "");

  const gwb = new ExcelJS.Workbook();
  const gs = gwb.addWorksheet("Sheet1");
  gs.addRow(["선수명", "성별", "생년월일", "체육관명", "경기구분", "체급"]);
  gs.addRow(["일반선수", "남", "2008-05-12", "일반짐", "고등부", "라이트급 -60kg"]);
  const gp = await parseApplicantExcelWorkbook(
    Buffer.from(await gwb.xlsx.writeBuffer()),
  );
  report.genericRows = gp.rows.length;
  report.genericSkip = gp.skippedExampleRows;

  const lwb = new ExcelJS.Workbook();
  const ls = lwb.addWorksheet("선수 신청");
  ls.addRow([
    "선수명",
    "성별",
    "생년월일",
    "연락처",
    "체육관명",
    "경기구분",
    "체급",
    "체중기준",
    "종목",
    "체중",
    "보호자이름",
    "보호자연락처",
    "메모",
  ]);
  ls.addRow([
    "레거시선수",
    "남",
    "2008-05-12",
    "010-1111-2222",
    "레거시짐",
    "고등부",
    "라이트급 -60kg",
    "-60kg",
    "킥복싱",
    "60",
    "",
    "",
    "",
  ]);
  const lp = await parseApplicantExcelWorkbook(
    Buffer.from(await lwb.xlsx.writeBuffer()),
  );
  report.legacyRows = lp.rows.length;

  const opsPath = join(process.cwd(), "dev", "2026_9_5 마포구청장배 선수.xlsx");
  const opsWb = new ExcelJS.Workbook();
  await opsWb.xlsx.load(readFileSync(opsPath) as never);
  const ops = opsWb.worksheets[0]!;
  const header = ops.getRow(1);
  const lastCol = Math.max(header.cellCount, 11);
  header.getCell(lastCol + 1).value = "경기구분";
  header.getCell(lastCol + 2).value = "체급";
  let filled = 0;
  for (let r = 2; r <= ops.rowCount && filled < 3; r += 1) {
    const name = String(ops.getRow(r).getCell(3).value ?? "").trim();
    const gender = String(ops.getRow(r).getCell(4).value ?? "").trim();
    const birthCell = ops.getRow(r).getCell(5).value;
    const birth = String(birthCell ?? "").trim();
    if (!name || !gender || !birth) continue;
    ops.getRow(r).getCell(lastCol + 1).value = "고등부";
    ops.getRow(r).getCell(lastCol + 2).value = "라이트급 -60kg";
    filled += 1;
  }
  const opsAugPath = join(OUT, "ops-plus-division-class.xlsx");
  await opsWb.xlsx.writeFile(opsAugPath);
  const opsParsed = await parseApplicantExcelWorkbook(readFileSync(opsAugPath));
  report.opsAugRows = opsParsed.rows.length;
  report.opsAugSkipped = opsParsed.skippedExampleRows;
  const preview = analyzeApplicantExcelRows({
    fileName: "ops-aug.xlsx",
    headerRow: opsParsed.headerRow,
    rows: opsParsed.rows,
    divisions: [
      {
        id: "d1",
        sportType: "킥복싱",
        ruleType: null,
        gender: "male",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
        weightClassName: "라이트급",
        weightLimitText: "-60kg",
        skillLevel: null,
      },
    ],
    existing: [],
  });
  report.opsAugCreate = preview.counts.create;
  report.opsAugError = preview.counts.error;
  report.opsAugFilled = filled;

  report.heightJung1Ok = parseOptionalHeightCm("중1").ok;
  report.weight77kg = parseOptionalWeightKg("77kg").kg ?? "null";
  report.birthYmd = parseApplicantBirthDate("20100708") ?? "null";
  const genderParsed = parseApplicantGender("남");
  report.genderNam = genderParsed.ok ? genderParsed.gender : "null";

  writeFileSync(join(OUT, "supplemental-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
