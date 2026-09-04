/**
 * READ ONLY — production EventApplication division recovery candidates (full names).
 * Never UPDATE. Writes local xlsx only.
 *
 *   npx tsx scripts/ops/recovery/export-event-division-recovery-candidates-full.mts
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import ExcelJS from "exceljs";

const EVENT_ID = "cms72kb8f00020pl76zacldj1";
const OUT_NAME = "event-division-recovery-candidates-full-2026-09-03.xlsx";

type DivMap = Record<string, { ageGroup: string; gender: string }>;

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

function snapshotName(fighterSnapshot: unknown): string | null {
  if (!fighterSnapshot || typeof fighterSnapshot !== "object" || Array.isArray(fighterSnapshot)) {
    return null;
  }
  const snap = fighterSnapshot as Record<string, unknown>;
  const raw = snap.name ?? snap.fighterName;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

function resolveFighterFullName(input: {
  fighterSnapshot: unknown;
  fighterName: string | null;
  memberName: string | null;
}): string {
  const fromSnap = snapshotName(input.fighterSnapshot);
  if (fromSnap) return fromSnap;
  const fromFighter = (input.fighterName ?? "").trim();
  if (fromFighter) return fromFighter;
  const fromMember = (input.memberName ?? "").trim();
  if (fromMember) return fromMember;
  return "(이름 없음)";
}

function snapshotGymName(gymSnapshot: unknown): string | null {
  if (!gymSnapshot || typeof gymSnapshot !== "object" || Array.isArray(gymSnapshot)) {
    return null;
  }
  const name = (gymSnapshot as Record<string, unknown>).name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return null;
}

function resolveAppliedGymName(input: {
  gymNameSnapshot: string | null;
  gymSnapshot: unknown;
  linkedGymName: string | null;
}): string {
  const fromCol = (input.gymNameSnapshot ?? "").trim();
  if (fromCol) return fromCol;
  const fromSnap = snapshotGymName(input.gymSnapshot);
  if (fromSnap) return fromSnap;
  const fromGym = (input.linkedGymName ?? "").trim();
  if (fromGym) return fromGym;
  return "(소속 미상)";
}

const envPath = path.join(process.env.TEMP!, "matchon-env", "prod-pg.json");
if (!fs.existsSync(envPath)) {
  throw new Error(`Missing ${envPath} — production credentials required`);
}
const { DATABASE_PUBLIC_URL } = JSON.parse(fs.readFileSync(envPath, "utf8"));

const client = new pg.Client({
  connectionString: DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query("BEGIN");
await client.query("SET TRANSACTION READ ONLY");
await client.query("SET statement_timeout = 120000");

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
    ea."fighterSnapshot" AS fighter_snapshot,
    ea."gymSnapshot" AS gym_snapshot,
    ea."gymNameSnapshot" AS gym_name_snapshot,
    ea."gymId" AS gym_id,
    g.name AS linked_gym_name,
    f.name AS fighter_name,
    f."currentGymId" AS current_gym_id,
    cg.name AS current_gym_name,
    gm.name AS member_name,
    ea."schoolLevelSnapshot" AS school_level,
    ea."schoolGradeSnapshot" AS school_grade,
    ea."divisionId" AS current_division_id,
    ed."ageGroup" AS current_age_group,
    ea."divisionSelectionType"::text AS selection_type,
    ea."updatedAt"::text AS updated_at,
    ea."createdAt"::text AS created_at
  FROM "EventApplication" ea
  JOIN "Fighter" f ON f.id = ea."fighterId"
  LEFT JOIN "Gym" g ON g.id = ea."gymId"
  LEFT JOIN "Gym" cg ON cg.id = f."currentGymId"
  LEFT JOIN "GymMember" gm ON gm.id = f."gymMemberId"
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
  const fromDivisionId =
    String(
      before?.fromDivisionId ??
        before?.originalApplicationDivisionId ??
        after?.originalApplicationDivisionId ??
        "",
    ) || null;
  const toDivisionId =
    String(after?.toDivisionId ?? after?.bracketDivisionId ?? "") || null;
  const list = movesByApp.get(applicationId) ?? [];
  list.push({ at: row.at, fromDivisionId, toDivisionId });
  movesByApp.set(applicationId, list);
}

type CandidateRow = {
  group: "A" | "B1" | "B2" | "C";
  confidence: string;
  applicationId: string;
  fighterId: string;
  appliedGymName: string;
  currentGymName: string;
  gymDisplay: string;
  fighterFullName: string;
  schoolLevel: string | null;
  schoolGrade: number | null;
  gradeLabel: string;
  currentAgeGroup: string | null;
  originalAgeGroup: string | null;
  currentDivisionId: string | null;
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
const sheetB1: CandidateRow[] = [];
const sheetB2: CandidateRow[] = [];
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

  const appliedGymName = resolveAppliedGymName({
    gymNameSnapshot: app.gym_name_snapshot as string | null,
    gymSnapshot: app.gym_snapshot,
    linkedGymName: app.linked_gym_name as string | null,
  });
  const currentGymName = ((app.current_gym_name as string | null) ?? "").trim();
  const gymDisplay =
    currentGymName && currentGymName !== appliedGymName
      ? `${appliedGymName} (현재: ${currentGymName})`
      : appliedGymName;

  const fighterFullName = resolveFighterFullName({
    fighterSnapshot: app.fighter_snapshot,
    fighterName: app.fighter_name as string | null,
    memberName: app.member_name as string | null,
  });

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
    lastMove && app.updated_at && String(app.updated_at) > String(lastMove.at),
  );

  const recoverableOriginal =
    Boolean(originalDivId && originalAge) &&
    originalAge !== currentAge &&
    moves.length > 0;

  let confidence = "C";
  let note = "";
  let group: "A" | "B1" | "B2" | "C" = "C";

  if (studentToOpen && recoverableOriginal) {
    if (!updatedAfterLastMove) {
      group = "A";
      confidence = "A";
      note =
        assigned === "미배정"
          ? "BracketChangeLog fromDivision 명확 · 미배정 · 추가 edit 흔적 없음"
          : "BracketChangeLog fromDivision 명확 · 현재 대진 배정 중 · 복구 전 운영 확인";
    } else {
      group = "B1";
      confidence = "B";
      note =
        "BracketChangeLog fromDivision 명확하나 cross 이후 updatedAt touch — 신청 수정 가능성";
    }
  } else if (studentToOpen) {
    group = "B1";
    confidence = "C";
    note = "student→일반부이나 복구용 fromDivision 근거 불충분";
  } else if (studentCrossLevel) {
    group = "B2";
    confidence = "B";
    note = originalAge
      ? `학교급 기대=${expected}, 현재=${currentAge}, log원본=${originalAge}`
      : `학교급 기대=${expected}, 현재=${currentAge}, cross log 없음/불명확`;
  } else if (adultToStudent) {
    group = "C";
    confidence = "B";
    note = "성인/미상 schoolLevel → 학생부 division — 자동 복구 금지";
  }

  const row: CandidateRow = {
    group,
    confidence,
    applicationId: app.application_id,
    fighterId: app.fighter_id,
    appliedGymName,
    currentGymName: currentGymName || appliedGymName,
    gymDisplay,
    fighterFullName,
    schoolLevel: school,
    schoolGrade: grade,
    gradeLabel: gradeLabel(school, grade),
    currentAgeGroup: currentAge,
    originalAgeGroup: originalAge ?? expected,
    currentDivisionId: currentDivId,
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

  if (group === "A") sheetA.push(row);
  else if (group === "B1") sheetB1.push(row);
  else if (group === "B2") sheetB2.push(row);
  else sheetC.push(row);
}

function toExcelRow(r: CandidateRow) {
  const gymCols =
    r.currentGymName && r.currentGymName !== r.appliedGymName
      ? {
          신청_당시_체육관: r.appliedGymName,
          현재_체육관: r.currentGymName,
        }
      : {
          체육관명: r.appliedGymName,
          신청_당시_체육관: r.appliedGymName,
          현재_체육관: r.currentGymName,
        };

  return {
    체육관명: r.appliedGymName,
    ...gymCols,
    선수_풀네임: r.fighterFullName,
    학교급: r.schoolLevel ?? "",
    학년: r.gradeLabel,
    현재_경기구분: r.currentAgeGroup ?? "",
    원래_경기구분_후보: r.originalAgeGroup ?? "",
    현재_대진_경기구분: r.bracketAgeGroup,
    현재_대진_여부: r.assigned,
    applicationId: r.applicationId,
    fighterId: r.fighterId,
    currentDivisionId: r.currentDivisionId ?? "",
    originalDivisionId_후보: r.originalDivisionId ?? "",
    cross_move_일시: r.crossMoveAt,
    근거: r.evidence,
    확신도: r.confidence,
    비고: r.note,
    학교급_기대_경기구분: r.expectedFromSchool ?? "",
    updatedAt: r.updatedAt,
  };
}

async function appendSheet(
  wb: ExcelJS.Workbook,
  name: string,
  rows: CandidateRow[],
) {
  const sheet = wb.addWorksheet(name);
  const data = rows.map(toExcelRow);
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
wb.creator = "matchon-readonly-audit-full";
await appendSheet(wb, "A_확정_복구_후보", sheetA);
await appendSheet(wb, "B1_학생_일반부_검토", sheetB1);
await appendSheet(wb, "B2_학생부_교차_검토", sheetB2);
await appendSheet(wb, "C_성인_미상_학생부", sheetC);

const outDir = path.join(process.cwd(), "tmp");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, OUT_NAME);
await wb.xlsx.writeFile(outPath);

function reportTable(rows: CandidateRow[]) {
  return rows.map((r) => ({
    체육관: r.appliedGymName,
    선수명: r.fighterFullName,
    학년: r.gradeLabel,
    현재_경기구분: r.currentAgeGroup ?? "",
    원래_경기구분: r.originalAgeGroup ?? "",
    현재_대진: `${r.assigned} (${r.bracketAgeGroup})`,
    근거: r.evidence,
  }));
}

const summary = {
  host,
  eventId: EVENT_ID,
  productionWrites: "NONE",
  recoveryExecuted: "NONE",
  counts: {
    A: sheetA.length,
    B1: sheetB1.length,
    B2: sheetB2.length,
    C: sheetC.length,
    total: sheetA.length + sheetB1.length + sheetB2.length + sheetC.length,
  },
  outPath,
  tables: {
    A: reportTable(sheetA),
    B1: reportTable(sheetB1),
    B2: reportTable(sheetB2),
    C: sheetC.map((r) => ({
      체육관: r.appliedGymName,
      선수명: r.fighterFullName,
      학교정보: r.gradeLabel || (r.schoolLevel ?? ""),
      현재_경기구분: r.currentAgeGroup ?? "",
      원래_경기구분_후보: r.originalAgeGroup ?? "",
      현재_대진: `${r.assigned} (${r.bracketAgeGroup})`,
      근거: r.evidence,
    })),
  },
};

fs.writeFileSync(
  path.join(process.env.TEMP!, "matchon-env", "recovery-candidates-full-summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);
console.log(JSON.stringify(summary, null, 2));

await client.query("COMMIT");
await client.end();
