import { formatPublicDateTime } from "@/lib/date-display";

export type ArchivePackageFileSource =
  | "archive_snapshot"
  | "live_read_only"
  | "generated_guide"
  | "skipped";

export type ArchivePackageIncludedFile = {
  name: string;
  source: ArchivePackageFileSource;
};

export type ArchivePackageManifestInput = {
  eventId: string;
  eventName: string;
  completedAt: string;
  exportedAt: string;
  archiveVersion: number;
  applicationCount: number;
  matchCount: number;
  confirmedResultCount: number;
  judgeScoreCount: number;
  weighInCount: number;
  includeWeighInPdf: boolean;
  includeBracketPdf: boolean;
};

const FILE_DESCRIPTIONS: Record<
  string,
  { title: string; lines: string[] }
> = {
  "01_event_info.json": {
    title: "01_event_info.json",
    lines: [
      "- 대회 기본정보 원본 데이터",
      "- 대회명, 일정, 장소, 상태 등 대회 전체 정보가 포함됩니다.",
      "- 시스템 보존/검증용",
    ],
  },
  "02_applications.xlsx": {
    title: "02_applications.xlsx",
    lines: [
      "- 대회 신청자 명단",
      "- 신청 선수, 체육관, 신청 종목/체급 등 신청 당시 정보",
      "- 운영자가 직접 열람하는 파일",
    ],
  },
  "03_weigh_in.xlsx": {
    title: "03_weigh_in.xlsx",
    lines: [
      "- 계체 기록",
      "- 선수별 계체값과 계체 상태",
      "- 운영자가 직접 열람하는 파일",
    ],
  },
  "03_weigh_in.pdf": {
    title: "03_weigh_in.pdf",
    lines: [
      "- 계체 기록 PDF",
      "- 출력/보관용 문서",
    ],
  },
  "04_brackets.pdf": {
    title: "04_brackets.pdf",
    lines: [
      "- 최종 대진표",
      "- 경기번호, 대진 배치, RED/BLUE 선수 정보",
      "- 운영자가 직접 열람하거나 출력하는 파일",
    ],
  },
  "04_brackets_snapshot.json": {
    title: "04_brackets_snapshot.json",
    lines: [
      "- 대회 종료 시점의 대진 구조 원본",
      "- RED/BLUE 배치, 경기번호, 대진 구조 보존",
      "- 시스템 보존/검증용",
    ],
  },
  "05_match_results.xlsx": {
    title: "05_match_results.xlsx",
    lines: [
      "- 대회 최종 경기 결과",
      "- 경기당 1행으로 정리된 결과 파일",
      "- 홍코너, 청코너, 승자, 승부방식, 확정상태 등을 포함",
      "- RED/BLUE는 실제 대진표 배치 기준",
      "- 운영자가 직접 열람하는 파일",
    ],
  },
  "05_match_results_snapshot.json": {
    title: "05_match_results_snapshot.json",
    lines: [
      "- 종료 시점 경기 결과 원본 데이터",
      "- 시스템 보존/검증용",
    ],
  },
  "07_judge_scores.xlsx": {
    title: "07_judge_scores.xlsx",
    lines: [
      "- 실제 심판 채점 기록",
      "- 경기별 심판, 라운드별 RED/BLUE 점수, 합계 및 판정",
      "- 운영자가 직접 열람하는 파일",
    ],
  },
  "manifest.json": {
    title: "manifest.json",
    lines: [
      "- 전체 압축파일 정보",
      "- 대회 ID, 종료시각, 생성시각, 신청자 수, 경기 수, 채점 수 등",
      "- 시스템 보존/검증용",
    ],
  },
  "README.txt": {
    title: "README.txt",
    lines: [
      "- 현재 보고 있는 파일",
      "- 각 파일의 역할과 사용 방법 안내",
    ],
  },
};

/** ZIP에 실제 포함되는 파일 목록 SSOT (README 제외, manifest 포함) */
export function resolveArchivePackageIncludedFiles(
  input: Pick<
    ArchivePackageManifestInput,
    "includeWeighInPdf" | "includeBracketPdf"
  >,
): ArchivePackageIncludedFile[] {
  const files: ArchivePackageIncludedFile[] = [
    { name: "01_event_info.json", source: "archive_snapshot" },
    { name: "02_applications.xlsx", source: "archive_snapshot" },
    { name: "03_weigh_in.xlsx", source: "live_read_only" },
    ...(input.includeWeighInPdf
      ? [{ name: "03_weigh_in.pdf", source: "live_read_only" as const }]
      : []),
    ...(input.includeBracketPdf
      ? [{ name: "04_brackets.pdf", source: "live_read_only" as const }]
      : []),
    { name: "04_brackets_snapshot.json", source: "archive_snapshot" },
    { name: "05_match_results.xlsx", source: "archive_snapshot" },
    { name: "05_match_results_snapshot.json", source: "archive_snapshot" },
    { name: "07_judge_scores.xlsx", source: "live_read_only" },
    { name: "manifest.json", source: "archive_snapshot" },
  ];
  return files;
}

export function buildArchivePackageManifest(
  input: ArchivePackageManifestInput,
): {
  eventId: string;
  eventName: string;
  completedAt: string;
  exportedAt: string;
  archiveVersion: number;
  applicationCount: number;
  matchCount: number;
  confirmedResultCount: number;
  judgeScoreCount: number;
  weighInCount: number;
  files: string[];
  sources: Record<string, ArchivePackageFileSource>;
} {
  const included = resolveArchivePackageIncludedFiles(input);
  const skippedSources: Record<string, ArchivePackageFileSource> = {};
  if (!input.includeWeighInPdf) {
    skippedSources["03_weigh_in.pdf"] = "skipped";
  }
  if (!input.includeBracketPdf) {
    skippedSources["04_brackets.pdf"] = "skipped";
  }

  const files = included.map((f) => f.name);
  const sources: Record<string, ArchivePackageFileSource> = {
    ...Object.fromEntries(included.map((f) => [f.name, f.source])),
    ...skippedSources,
  };

  return {
    eventId: input.eventId,
    eventName: input.eventName,
    completedAt: input.completedAt,
    exportedAt: input.exportedAt,
    archiveVersion: input.archiveVersion,
    applicationCount: input.applicationCount,
    matchCount: input.matchCount,
    confirmedResultCount: input.confirmedResultCount,
    judgeScoreCount: input.judgeScoreCount,
    weighInCount: input.weighInCount,
    files,
    sources,
  };
}

/** README에 표시할 파일 순서 (README.txt 자체는 맨 마지막 설명) */
export function resolveArchiveReadmeFileOrder(
  includedFiles: string[],
): string[] {
  const ordered = [
    ...includedFiles.filter((name) => name !== "manifest.json"),
    "manifest.json",
    "README.txt",
  ].filter((name, index, arr) => arr.indexOf(name) === index);
  return ordered.filter(
    (name) => name === "README.txt" || includedFiles.includes(name),
  );
}

export function buildArchiveReadmeText(input: {
  eventName: string;
  completedAt: string;
  exportedAt: string;
  includedFiles: string[];
}): string {
  const readmeOrder = resolveArchiveReadmeFileOrder(input.includedFiles);
  const fileSections = readmeOrder
    .map((name) => {
      const desc = FILE_DESCRIPTIONS[name];
      if (!desc) return null;
      return [desc.title, ...desc.lines].join("\n");
    })
    .filter(Boolean);

  return [
    "MATCHON 대회 기록 보관 파일 안내",
    "",
    `대회명: ${input.eventName}`,
    `대회 종료일시: ${formatPublicDateTime(input.completedAt)}`,
    `기록 생성일시: ${formatPublicDateTime(input.exportedAt)}`,
    "",
    "이 압축파일은 대회 종료 시점의 주요 운영 기록을 보관하기 위한 파일입니다.",
    "Excel/PDF 파일은 사람이 확인하기 위한 자료입니다.",
    "JSON 파일은 대회 종료 당시의 원본 데이터를 보존하는 파일이므로",
    "임의로 수정하거나 삭제하지 않는 것을 권장합니다.",
    "",
    "[파일 안내]",
    "",
    fileSections.join("\n\n"),
    "",
  ].join("\n");
}

/** Windows 메모장 호환 — UTF-8 BOM */
export function encodeArchiveReadmeUtf8(text: string): Buffer {
  return Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(text, "utf8"),
  ]);
}
