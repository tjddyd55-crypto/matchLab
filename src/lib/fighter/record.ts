/**
 * 선수 전적 구조화 유틸리티
 *
 * 모든 입력 경로(직접등록·외부링크·Excel·회원기반신청)에서 공유.
 * - 구조화 전적 검증: totalBouts = wins + draws + losses
 * - recordText 자동 생성
 * - 레거시 자유문장 파싱 (확실한 패턴만)
 * - 학년 구조화: "초3" → schoolLevel/schoolGrade
 */

// ────────────────────────────────────────────────────
// 전적 구조화 타입
// ────────────────────────────────────────────────────

export type StructuredRecord = {
  totalBouts: number;
  wins: number;
  draws: number;
  losses: number;
};

export type RecordParseResult =
  | { ok: true; record: StructuredRecord; recordText: string }
  | { ok: false; error: string; raw: string };

// ────────────────────────────────────────────────────
// 학년 구조화 타입
// ────────────────────────────────────────────────────

export const SCHOOL_LEVEL = {
  ELEMENTARY: "ELEMENTARY",
  MIDDLE: "MIDDLE",
  HIGH: "HIGH",
  ADULT: "ADULT",
} as const;

export type SchoolLevel = (typeof SCHOOL_LEVEL)[keyof typeof SCHOOL_LEVEL];

export type StructuredGrade = {
  schoolLevel: SchoolLevel;
  /** 초1~3: 1~3, 중1~3: 1~3, 고1~3: 1~3, 성인: null */
  schoolGrade: number | null;
};

export type GradeParseResult =
  | { ok: true; grade: StructuredGrade }
  | { ok: false; error: string };

// ────────────────────────────────────────────────────
// 초등부 학년 밴드
// ────────────────────────────────────────────────────

export const ELEMENTARY_LOW_BAND = [1, 2, 3] as const;
export const ELEMENTARY_HIGH_BAND = [4, 5, 6] as const;

export type ElementaryMatchBand = "LOW" | "HIGH";

export function getElementaryMatchBand(
  schoolGrade: number,
): ElementaryMatchBand | null {
  if (ELEMENTARY_LOW_BAND.includes(schoolGrade as (typeof ELEMENTARY_LOW_BAND)[number])) {
    return "LOW";
  }
  if (ELEMENTARY_HIGH_BAND.includes(schoolGrade as (typeof ELEMENTARY_HIGH_BAND)[number])) {
    return "HIGH";
  }
  return null;
}

// ────────────────────────────────────────────────────
// 학년 파싱
// ────────────────────────────────────────────────────

const GRADE_PATTERNS: Array<{
  re: RegExp;
  level: SchoolLevel;
  gradeGroup: number | null;
}> = [
  { re: /^초\s*([1-6])$/, level: "ELEMENTARY", gradeGroup: 1 },
  { re: /^중\s*([1-3])$/, level: "MIDDLE", gradeGroup: 1 },
  { re: /^고\s*([1-3])$/, level: "HIGH", gradeGroup: 1 },
  { re: /^(성인|일반|adult)$/i, level: "ADULT", gradeGroup: null },
];

export function parseGrade(raw: string | null | undefined): GradeParseResult {
  if (!raw) {
    return { ok: false, error: "학년 정보가 없습니다." };
  }
  const s = raw.trim();
  for (const { re, level, gradeGroup } of GRADE_PATTERNS) {
    const m = s.match(re);
    if (!m) continue;
    const schoolGrade =
      gradeGroup != null ? parseInt(m[gradeGroup]!, 10) : null;
    return { ok: true, grade: { schoolLevel: level, schoolGrade } };
  }
  return {
    ok: false,
    error: `학년 형식이 올바르지 않습니다: "${s}" (예: 초3, 중2, 고1, 성인)`,
  };
}

// ────────────────────────────────────────────────────
// 전적 검증
// ────────────────────────────────────────────────────

export type RecordValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateRecord(r: StructuredRecord): RecordValidationResult {
  if (r.totalBouts < 0 || r.wins < 0 || r.draws < 0 || r.losses < 0) {
    return { ok: false, error: "전적 값은 0 이상이어야 합니다." };
  }
  if (
    !Number.isInteger(r.totalBouts) ||
    !Number.isInteger(r.wins) ||
    !Number.isInteger(r.draws) ||
    !Number.isInteger(r.losses)
  ) {
    return { ok: false, error: "전적 값은 정수여야 합니다." };
  }
  const sum = r.wins + r.draws + r.losses;
  if (r.totalBouts !== sum) {
    return {
      ok: false,
      error: `총 경기수(${r.totalBouts})와 승·무·패 합계(${sum})가 일치하지 않습니다.`,
    };
  }
  return { ok: true };
}

// ────────────────────────────────────────────────────
// recordText 자동 생성
// ────────────────────────────────────────────────────

/**
 * 구조화 전적으로부터 화면 표시용 recordText 생성.
 * - 무전: "무전"
 * - 0무 생략: "3전 2승 1패"
 * - 0무 포함: "3전 2승 1무 1패"
 */
export function buildRecordText(r: StructuredRecord): string {
  if (r.totalBouts === 0) return "무전";
  const parts: string[] = [`${r.totalBouts}전`, `${r.wins}승`];
  if (r.draws > 0) parts.push(`${r.draws}무`);
  parts.push(`${r.losses}패`);
  return parts.join(" ");
}

// ────────────────────────────────────────────────────
// 레거시 자유문장 파싱
// ────────────────────────────────────────────────────

/**
 * 자유문장 전적을 구조화.
 * 확실하게 파싱 가능한 패턴만 성공 처리.
 * 애매하면 ok: false 반환 → 관리자 수동 확인 대상.
 */
export function parseRecordText(raw: string | null | undefined): RecordParseResult {
  if (!raw) {
    return {
      ok: true,
      record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
      recordText: "무전",
    };
  }
  const s = raw.trim();

  // 무전 패턴 (여러 표현 허용)
  if (/^[:\s]*(무전|0전|0경기)$/.test(s)) {
    return {
      ok: true,
      record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
      recordText: "무전",
    };
  }

  // "N전 W승 [D무] L패" 패턴 (공백 허용)
  const fullPattern =
    /^(\d+)\s*전\s*(\d+)\s*승\s*(?:(\d+)\s*무\s*)?(\d+)\s*패$/;
  const fullMatch = s.replace(/\s+/g, " ").match(fullPattern);
  if (fullMatch) {
    const totalBouts = parseInt(fullMatch[1]!, 10);
    const wins = parseInt(fullMatch[2]!, 10);
    const draws = fullMatch[3] ? parseInt(fullMatch[3], 10) : 0;
    const losses = parseInt(fullMatch[4]!, 10);
    const record: StructuredRecord = { totalBouts, wins, draws, losses };
    const validation = validateRecord(record);
    if (!validation.ok) {
      return { ok: false, error: validation.error, raw: s };
    }
    return { ok: true, record, recordText: buildRecordText(record) };
  }

  // "N전 W승" 또는 "N전 L패" (무·패/무·승 생략형)
  const twoPartPattern = /^(\d+)\s*전\s*(\d+)\s*(승|패)$/;
  const twoMatch = s.match(twoPartPattern);
  if (twoMatch) {
    const totalBouts = parseInt(twoMatch[1]!, 10);
    const val = parseInt(twoMatch[2]!, 10);
    const kind = twoMatch[3]!;
    const wins = kind === "승" ? val : 0;
    const losses = kind === "패" ? val : 0;
    const draws = totalBouts - wins - losses;
    if (draws < 0) {
      return { ok: false, error: "전적 수치가 맞지 않습니다.", raw: s };
    }
    const record: StructuredRecord = { totalBouts, wins, draws, losses };
    return { ok: true, record, recordText: buildRecordText(record) };
  }

  // "W승 L패" (총전 없는 명확한 형태)
  const wlPattern = /^(\d+)\s*승\s*(\d+)\s*패$/;
  const wlMatch = s.match(wlPattern);
  if (wlMatch) {
    const wins = parseInt(wlMatch[1]!, 10);
    const losses = parseInt(wlMatch[2]!, 10);
    const totalBouts = wins + losses;
    const record: StructuredRecord = { totalBouts, wins, draws: 0, losses };
    return { ok: true, record, recordText: buildRecordText(record) };
  }

  // 파싱 불가 — 관리자 수동 확인 필요
  return {
    ok: false,
    error: `전적 확인 필요: "${s}" — 총전/승/무/패를 직접 입력해 주세요.`,
    raw: s,
  };
}

/**
 * 출력·목록용 짧은 학년 라벨.
 * 예: 초5, 중2, 고1, 성인
 */
export function formatSchoolGradeCompactLabel(input: {
  schoolLevel: string | null | undefined;
  schoolGrade: number | null | undefined;
}): string | null {
  const level = input.schoolLevel?.trim() ?? "";
  if (!level) return null;
  if (level === SCHOOL_LEVEL.ADULT || level === "ADULT") return "성인";
  const grade = input.schoolGrade;
  if (grade == null || !Number.isFinite(grade)) return null;
  if (level === SCHOOL_LEVEL.ELEMENTARY || level === "ELEMENTARY") {
    return `초${grade}`;
  }
  if (level === SCHOOL_LEVEL.MIDDLE || level === "MIDDLE") {
    return `중${grade}`;
  }
  if (level === SCHOOL_LEVEL.HIGH || level === "HIGH") {
    return `고${grade}`;
  }
  return null;
}
