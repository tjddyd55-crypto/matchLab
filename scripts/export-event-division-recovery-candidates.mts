/**
 * READ ONLY — production EventApplication division recovery candidates.
 * Never UPDATE. Writes local xlsx only.
 *
 *   npx tsx scripts/export-event-division-recovery-candidates.mts
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import ExcelJS from "exceljs";

const EVENT_ID = "cms72kb8f00020pl76zacldj1";
const OUT_NAME = "event-division-recovery-candidates-2026-09-03.xlsx";

type DivMap = Record<string, { ageGroup: string; gender: string }>;

function maskName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "**";
  if (n.length === 1) return `${n}**`;
  return `${n[0]}**`;
}

function gradeLabel(level: string | null, grade: number | null): string {
  if (!level) return "";
  const base =
    level === "ELEMENTARY"
      ? "초"
      : level === "MIDDLE"
        ? "중"
        : level === "HIGH"
          ? "고"
          : level === "ADULT"
            ? "성인"
            : level;
  if (level === "ADULT" || grade == null) return base;
  return `${base}${grade}`;
}

function expectedAgeGroup(level: string | null): string | null {
  if (level === "ELEMENTARY") return "초등부";
  if (level === "MIDDLE") return "중등부";
  if (level === "HIGH") return "고등부";
  if (level === "ADULT") return "일반부";
  return null;
}

const envPath = path.join(process.env.TEMP!, "matchon-env", "prod-pg.json");
const { DATABASE_PUBLIC_URL } = JSON.parse(fs.readFileSync(envPath, "utf8"));

const client = new pg.Client({
  connectionString: DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query("BEGIN READ ONLY");
await client.query("SET TRANSACTION READ ONLY");
await client.query("SET statement_timeout = 60000");

const hostRow = await client.query("select inet_server_addr() as a");
const host = String(hostRow.rows[0]?.a ?? "");
if (!host && !DATABASE_PUBLIC_URL.includes("yamabiko")) {
  throw new Error("Abort: not yamabiko production host");
}

const divs = await client.query(
  `SELECT id, "ageGroup", gender FROM "EventDivision" WHERE "eventId" = $1`,
  [EVENT_ID],
);
const divMap: DivMap = {};
for (const d of divs.rows) {
  divMap[d.id] = { ageGroup: d.ageGroup, gender: d.gender };
}

const apps = await client.query(
  `
  SELECT
    ea.id AS application_id,
    ea."fighterId" AS fighter_id,
    f.name AS fighter_name,
    ea."schoolLevelSnapshot" AS school_level,
    ea."schoolGradeSnapshot" AS school_grade,
    ea."divisionId" AS current_division_id,
    ed."ageGroup" AS current_age_group,
    ed.gender AS current_div_gender,
    ea."divisionSelectionType"::text AS selection_type,
    ea."updatedAt"::text AS updated_at,
    ea."createdAt"::text AS created_at
  FROM "EventApplication" ea
  JOIN "Fighter" f ON f.id = ea."fighterId"
  LEFT JOIN "EventDivision" ed ON ed.id = ea."divisionId"
  WHERE ea."eventId" = $1
    AND ea.status IN ('approved', 'pending')
  `,
  [EVENT_ID],
);

const placements = await client.query(
  `
  SELECT
    ea.id AS application_id,
    b."divisionId" AS bracket_division_id,
    ed."ageGroup" AS bracket_age_group,
    bm.id AS match_id,
    CASE
      WHEN bm."fighterRedId" = ea."fighterId" THEN 'red'
      ELSE 'blue'
    END AS slot
  FROM "EventApplication" ea
  JOIN "BracketMatch" bm
    ON bm."fighterRedId" = ea."fighterId" OR bm."fighterBlueId" = ea."fighterId"
  JOIN "Bracket" b ON b.id = bm."bracketId" AND b."eventId" = ea."eventId"
  LEFT JOIN "EventDivision" ed ON ed.id = b."divisionId"
  WHERE ea."eventId" = $1
  `,
  [EVENT_ID],
);

const placeByApp = new Map<
  string,
  Array<{
    bracket_division_id: string | null;
    bracket_age_group: string | null;
    match_id: string;
    slot: string;
  }>
>();
for (const p of placements.rows) {
  const list = placeByApp.get(p.application_id) ?? [];
  list.push(p);
  placeByApp.set(p.application_id, list);
}

const logs = await client.query(
  `
  SELECT
    "createdAt"::text AS at,
    reason,
    "beforeData",
    "afterData"
  FROM "BracketChangeLog"
  WHERE "eventId" = $1
    AND (
      reason LIKE '교차 경기구분 수동 편성%'
      OR ("afterData"->>'source') = 'cross_division_manual_match'
    )
  ORDER BY "createdAt" ASC
  `,
  [EVENT_ID],
);

type CrossMove = {
  at: string;
  fromDivisionId: string | null;
  toDivisionId: string | null;
};
const movesByApp = new Map<string, CrossMove[]>();
for (const row of logs.rows) {
  const before = row.beforeData as Record<string, unknown> | null;
  const after = row.afterData as Record<string, unknown> | null;
  const applicationId = String(
    after?.applicationId ?? before?.applicationId ?? "",
  );
  if (!applicationId) continue;
  const fromDivisionId = String(
    before?.fromDivisionId ??
      before?.originalApplicationDivisionId ??
      after?.originalApplicationDivisionId ??
      "",
  ) || null;
  const toDivisionId = String(
    after?.toDivisionId ?? after?.bracketDivisionId ?? "",
  ) || null;
  const list = movesByApp.get(applicationId) ?? [];
  list.push({ at: row.at, fromDivisionId, toDivisionId });
  movesByApp.set(applicationId, list);
}

type CandidateRow = {
  sheet: "A" | "B" | "C";
  confidence: string;
  applicationId: string;
  fighterId: string;
  nameMask: string;
  schoolLevel: string | null;
  schoolGrade: number | null;
  gradeLabel: string;
  currentAgeGroup: string | null;
  currentDivisionId: string | null;
  originalAgeGroup: string | null;
  originalDivisionId: string | null;
  expectedFromSchool: string | null;
  bracketAgeGroup: string;
  assigned: string;
  crossMoveAt: string;
  moveCount: number;
  evidence: string;
  note: string;
  updatedAt: string;
};

const sheetA: CandidateRow[] = [];
const sheetB: CandidateRow[] = [];
const sheetC: CandidateRow[] = [];

for (const app of apps.rows) {
  const school = app.school_level as string | null;
  const grade = app.school_grade as number | null;
  const currentAge = app.current_age_group as string | null;
  const currentDivId = app.current_division_id as string | null;
  const expected = expectedAgeGroup(school);
  const places = placeByApp.get(app.application_id) ?? [];
  const assigned = places.length > 0 ? "배정" : "미배정";
  const bracketAge =
    places.map((p) => p.bracket_age_group).filter(Boolean).join(", ") || "-";
  const moves = movesByApp.get(app.application_id) ?? [];
  const lastMove = moves.length > 0 ? moves[moves.length - 1]! : null;
  const firstFrom = moves.find((m) => m.fromDivisionId)?.fromDivisionId ?? null;
  const originalDivId = firstFrom;
  const originalAge = originalDivId
    ? (divMap[originalDivId]?.ageGroup ?? null)
    : null;

  const studentToOpen =
    school &&
    ["ELEMENTARY", "MIDDLE", "HIGH"].includes(school) &&
    currentAge === "일반부";

  const studentCrossLevel =
    school &&
    expected &&
    currentAge &&
    ["ELEMENTARY", "MIDDLE", "HIGH"].includes(school) &&
    currentAge !== "일반부" &&
    currentAge !== expected;

  const adultToStudent =
    (school === "ADULT" || school == null) &&
    currentAge != null &&
    ["초등부", "중등부", "고등부"].includes(currentAge);

  if (!studentToOpen && !studentCrossLevel && !adultToStudent) continue;

  const updatedAfterLastMove = Boolean(
    lastMove &&
      app.updated_at &&
      String(app.updated_at) > String(lastMove.at),
  );

  const recoverableOriginal =
    Boolean(originalDivId && originalAge) &&
    originalAge !== currentAge &&
    moves.length > 0;

  let confidence = "C";
  let note = "";
  let sheet: "A" | "B" | "C" = "C";

  if (studentToOpen && recoverableOriginal) {
    if (!updatedAfterLastMove) {
      sheet = "A";
      confidence = "A";
      note =
        assigned === "미배정"
          ? "BracketChangeLog fromDivision 명확 · 미배정 · 추가 edit 흔적 없음"
          : "BracketChangeLog fromDivision 명확 · 현재 대진 배정 중 · 복구 전 운영 확인";
    } else {
      sheet = "B";
      confidence = "B";
      note =
        "BracketChangeLog fromDivision 명확하나 cross 이후 updatedAt touch — 신청 수정 가능성";
    }
  } else if (studentToOpen) {
    sheet = "B";
    confidence = "C";
    note = "student→일반부이나 복구용 fromDivision 근거 불충분";
  } else if (studentCrossLevel) {
    sheet = "B";
    confidence = "B";
    note = originalAge
      ? `학교급 기대=${expected}, 현재=${currentAge}, log원본=${originalAge}`
      : `학교급 기대=${expected}, 현재=${currentAge}, cross log 없음/불명확`;
  } else if (adultToStudent) {
    sheet = "C";
    confidence = "B";
    note = "성인/미상 schoolLevel → 학생부 division — 자동 복구 금지";
  }

  const row: CandidateRow = {
    sheet,
    confidence,
    applicationId: app.application_id,
    fighterId: app.fighter_id,
    nameMask: maskName(app.fighter_name),
    schoolLevel: school,
    schoolGrade: grade,
    gradeLabel: gradeLabel(school, grade),
    currentAgeGroup: currentAge,
    currentDivisionId: currentDivId,
    originalAgeGroup: originalAge ?? expected,
    originalDivisionId: originalDivId,
    expectedFromSchool: expected,
    bracketAgeGroup: bracketAge,
    assigned,
    crossMoveAt: lastMove?.at ?? "",
    moveCount: moves.length,
    evidence:
      moves.length > 0
        ? `BracketChangeLog cross_division ×${moves.length}`
        : "학교급↔ageGroup 불일치 only",
    note,
    updatedAt: app.updated_at,
  };

  if (sheet === "A") sheetA.push(row);
  else if (sheet === "B") sheetB.push(row);
  else sheetC.push(row);
}

const confirmed = sheetA;
const studentReview = sheetB;
const adultNullReview = sheetC;

function toSheetRows(rows: CandidateRow[]) {
  return rows.map((r, i) => ({
    "#": i + 1,
    applicationId: r.applicationId,
    fighterId: r.fighterId,
    선수명: r.nameMask,
    학교급: r.schoolLevel ?? "",
    학년: r.gradeLabel,
    현재_경기구분: r.currentAgeGroup ?? "",
    원래_경기구분_후보: r.originalAgeGroup ?? "",
    currentDivisionId: r.currentDivisionId ?? "",
    originalDivisionId: r.originalDivisionId ?? "",
    학교급_기대_경기구분: r.expectedFromSchool ?? "",
    현재_대진_경기구분: r.bracketAgeGroup,
    현재_대진_여부: r.assigned,
    cross_move_시각: r.crossMoveAt,
    moveCount: r.moveCount,
    근거: r.evidence,
    확신도: r.confidence,
    비고: r.note,
    updatedAt: r.updatedAt,
  }));
}

async function appendSheet(
  wb: ExcelJS.Workbook,
  name: string,
  rows: CandidateRow[],
) {
  const sheet = wb.addWorksheet(name);
  const data = toSheetRows(rows);
  if (data.length === 0) {
    sheet.addRow(["(해당 없음)"]);
    return;
  }
  const headers = Object.keys(data[0]!);
  sheet.addRow(headers);
  for (const row of data) {
    sheet.addRow(headers.map((h) => (row as Record<string, unknown>)[h]));
  }
}

const wb = new ExcelJS.Workbook();
wb.creator = "matchon-readonly-audit";
await appendSheet(wb, "확정_복구_후보", confirmed);
await appendSheet(wb, "학생부_교차_검토", studentReview);
await appendSheet(wb, "성인_미상_학생부_검토", adultNullReview);

const outDir = path.join(process.cwd(), "tmp");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, OUT_NAME);
await wb.xlsx.writeFile(outPath);

const summary = {
  host,
  eventId: EVENT_ID,
  productionWrites: "NONE",
  counts: {
    confirmedA: confirmed.length,
    studentReviewB: studentReview.length,
    adultNullReview: adultNullReview.length,
  },
  confirmedPreview: confirmed.map((r) => ({
    name: r.nameMask,
    grade: r.gradeLabel,
    current: r.currentAgeGroup,
    original: r.originalAgeGroup,
    assigned: r.assigned,
    at: r.crossMoveAt,
    confidence: r.confidence,
  })),
  outPath,
};

fs.writeFileSync(
  path.join(process.env.TEMP!, "matchon-env", "recovery-candidates-summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);
console.log(JSON.stringify(summary, null, 2));

await client.query("COMMIT");
await client.end();
