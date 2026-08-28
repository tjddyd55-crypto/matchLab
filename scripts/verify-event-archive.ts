/**
 * 대회 종료 기록 Archive SSOT
 *   npm run verify:event-archive
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ApplicantExcelExportRow } from "../src/lib/applications/applicant-excel-export-fields";
import {
  measureSnapshotBytes,
  projectPublicApplicantRows,
  type EventArchiveBracketMatchSnapshot,
} from "../src/lib/event-archive/types";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function sampleApplicant(
  overrides: Partial<ApplicantExcelExportRow> = {},
): ApplicantExcelExportRow {
  return {
    applicationId: "app-b",
    gymName: "체육관1",
    fighterName: "B",
    phone: "01011112222",
    fighterGender: "male",
    birthDate: new Date("2005-01-01"),
    division: null,
    divisionLabel: "고등부 남 -70kg",
    applicationWeightKg: 68,
    recordText: "2승",
    careerText: null,
    paymentStatus: "paid",
    applicationStatus: "approved",
    cancellationSource: null,
    additionalInfoLabel: "완료",
    appliedAt: "2026-08-28T00:00:00.000Z",
    depositorName: "B",
    memo: null,
    isAssigned: true,
    ...overrides,
  };
}

function corner(name: string, gym: string): EventArchiveBracketMatchSnapshot["red"] {
  return { fighterId: `f-${name}`, name, gymName: gym, recordSummary: null };
}

function multiMatchBracket(): EventArchiveBracketMatchSnapshot[] {
  return [
    {
      matchId: "m1",
      bracketId: "b1",
      bracketTitle: "본선",
      matchNumber: 1,
      globalMatchOrder: 1,
      matchOrder: 1,
      round: 1,
      roundName: null,
      divisionLabel: "고등부",
      courtName: null,
      matNumber: null,
      red: corner("A", "체육관A"),
      blue: corner("B", "체육관1"),
      status: "finished",
      statusLabel: "종료",
      winnerId: "f-A",
      winnerName: "A",
      loserId: "f-B",
      loserName: "B",
      resultType: "points",
      resultTypeLabel: "점수",
      resultMemo: null,
      organizerMemo: null,
      matchWeightKg: null,
      nextMatchId: null,
      nextMatchSlot: null,
      hasOfficialResults: true,
    },
    {
      matchId: "m2",
      bracketId: "b1",
      bracketTitle: "본선",
      matchNumber: 2,
      globalMatchOrder: 2,
      matchOrder: 2,
      round: 1,
      roundName: null,
      divisionLabel: "고등부",
      courtName: null,
      matNumber: null,
      red: corner("C", "체육관C"),
      blue: corner("B", "체육관1"),
      status: "finished",
      statusLabel: "종료",
      winnerId: "f-B",
      winnerName: "B",
      loserId: "f-C",
      loserName: "C",
      resultType: "submission",
      resultTypeLabel: "서브미션",
      resultMemo: null,
      organizerMemo: null,
      matchWeightKg: null,
      nextMatchId: null,
      nextMatchSlot: null,
      hasOfficialResults: true,
    },
  ];
}

async function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model EventArchive/);
  assert.match(schema, /@@unique\(\[eventId, version\]\)/);
  assert.match(schema, /eventSnapshot\s+Json/);
  assert.match(schema, /applicantsSnapshot\s+Json/);
  assert.match(schema, /bracketSnapshot\s+Json/);
  assert.match(schema, /resultsSnapshot\s+Json/);

  const eventService = read("src/lib/services/event.service.ts");
  assert.match(eventService, /createArchiveInTransaction/);
  assert.match(eventService, /EventStatus\.finished/);
  assert.match(eventService, /archiveVersion: 1/);

  const archiveService = read("src/lib/services/event-archive.service.ts");
  assert.match(archiveService, /ARCHIVE_VERSION_INITIAL = 1/);
  assert.match(archiveService, /created: false/);

  const snapshotBuilder = read("src/lib/event-archive/snapshot-builder.ts");
  assert.match(snapshotBuilder, /cornerFromSnapshot/);
  assert.match(snapshotBuilder, /fighterRedSnapshot/);
  assert.doesNotMatch(snapshotBuilder, /dedupe|uniqueFighter/i);

  const statusControl = read("src/components/domain/events/EventStatusControl.tsx");
  assert.match(statusControl, /getEventArchiveFinishSummaryAction/);
  assert.match(statusControl, /대회 종료 및 기록 보관/);
  assert.doesNotMatch(statusControl, /window\.confirm/);

  const archivePage = read(
    "src/app/(dashboard)/organizer/events/[eventId]/archive/page.tsx",
  );
  assert.match(archivePage, /기록 보관 기능 도입 이전/);

  const excelService = read(
    "src/lib/services/event-archive-applicant-excel.service.ts",
  );
  assert.match(excelService, /requireActiveArchive/);
  assert.match(excelService, /applicantsSnapshot/);
  assert.doesNotMatch(excelService, /listOrganizerEventApplications/);

  // 복수 경기: B가 두 match에 각각 존재
  const matches = multiMatchBracket();
  assert.equal(matches.length, 2);
  const bAppearances = matches.filter(
    (m) => m.red?.name === "B" || m.blue?.name === "B",
  );
  assert.equal(bAppearances.length, 2);
  assert.notEqual(bAppearances[0]!.matchId, bAppearances[1]!.matchId);
  assert.equal(bAppearances[0]!.blue?.gymName, "체육관1");
  assert.equal(bAppearances[1]!.blue?.gymName, "체육관1");

  // 불변성: archive JSON clone 후 live 변경 시뮬레이션
  const archivedApplicants = {
    rows: [sampleApplicant()],
    totalCount: 1,
    participantCount: 1,
  };
  const archiveCopy = structuredClone(archivedApplicants);
  const liveRow = sampleApplicant();
  liveRow.fighterName = "B-변경됨";
  liveRow.gymName = "체육관999";
  assert.equal(archiveCopy.rows[0]!.fighterName, "B");
  assert.equal(archiveCopy.rows[0]!.gymName, "체육관1");

  const archivedResults = {
    rows: [
      {
        resultId: "r1",
        matchId: "m1",
        matchNumber: 1,
        bracketTitle: "본선",
        divisionLabel: "고등부",
        fighterId: "f-B",
        fighterName: "B",
        fighterGymName: "체육관1",
        opponentId: "f-A",
        opponentName: "A",
        opponentGymName: "체육관A",
        result: "loss",
        resultLabel: "패",
        resultType: "points",
        resultTypeLabel: "점수",
        status: "confirmed",
        statusLabel: "확정",
        matchDateLabel: "2026-08-28",
      },
    ],
    totalCount: 1,
  };
  const resultsCopy = structuredClone(archivedResults);
  archivedResults.rows[0]!.resultLabel = "승";
  assert.equal(resultsCopy.rows[0]!.resultLabel, "패");

  // JSON serializable + byte size
  const snapshots = {
    eventSnapshot: {
      eventId: "e1",
      title: "테스트 대회",
      eventDateLabel: "2026-08-28",
      locationLabel: "서울",
      organizerName: "MATCHON",
      statusLabel: "종료",
      registrationPeriodLabel: "2026-08-01 ~ 2026-08-20",
      publicSlug: "test-event",
    },
    applicantsSnapshot: archivedApplicants,
    bracketSnapshot: { matches, divisionCount: 1, totalMatchCount: 2 },
    resultsSnapshot: resultsCopy,
  };
  const serialized = JSON.stringify(snapshots);
  assert.ok(serialized.length > 0);
  JSON.parse(serialized);

  const bytes = measureSnapshotBytes(snapshots);
  assert.ok(bytes.totalBytes > 0);
  assert.ok(bytes.applicantsBytes > 0);
  assert.ok(bytes.bracketBytes > 0);
  console.log(
    `snapshot bytes (small fixture): event=${bytes.eventBytes} applicants=${bytes.applicantsBytes} bracket=${bytes.bracketBytes} results=${bytes.resultsBytes} total=${bytes.totalBytes}`,
  );

  // 공개 projection — 개인정보 제외
  const publicRows = projectPublicApplicantRows(
    [sampleApplicant({ phone: "01099998888", memo: "비밀" })],
    (row) => ({
      genderLabel: "남",
      statusLabel: "승인",
      divisionLabel: row.divisionLabel,
    }),
  );
  assert.equal(publicRows[0]!.fighterName, "B");
  assert.ok(!("phone" in publicRows[0]!));
  assert.ok(!("memo" in publicRows[0]!));

  console.log("verify:event-archive OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
