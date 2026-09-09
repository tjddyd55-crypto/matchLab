import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import type { EventArchiveResultsSnapshot } from "@/lib/event-archive/types";
import { buildExcelWorkbook } from "@/lib/excel-export/build-workbook";
import type { ExcelExportField } from "@/lib/excel-export/types";
import { isMatchOpsManualLoginId } from "@/lib/match-ops-judge-score";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fieldStatusService } from "@/lib/services/field-status.service";
import { generateBracketPrintPdfBuffer } from "@/lib/brackets/bracket-print-pdf";
import { generateWeighInSheetPdfBuffer } from "@/lib/brackets/bracket-print-pdf";

type WeighInExportRow = {
  fighterName: string;
  gymName: string;
  divisionLabel: string;
  weightClassLabel: string;
  weighInWeightKg: string;
  weighInStatusLabel: string;
  checkInStatusLabel: string;
  eligibilityLabel: string;
  fieldMemo: string;
};

type ResultExportRow = EventArchiveResultsSnapshot["rows"][number];

type JudgeScoreExportRow = {
  matchNumber: string;
  courtName: string;
  judgeName: string;
  source: string;
  roundNumber: number;
  redScore: string;
  blueScore: string;
  redTotal: string;
  blueTotal: string;
  decision: string;
  updatedAt: string;
};

const WEIGH_IN_FIELDS: ReadonlyArray<ExcelExportField<string, WeighInExportRow>> = [
  { key: "fighterName", label: "선수명", defaultSelected: true, extract: (r) => r.fighterName },
  { key: "gymName", label: "체육관", defaultSelected: true, extract: (r) => r.gymName },
  { key: "divisionLabel", label: "경기구분", defaultSelected: true, extract: (r) => r.divisionLabel },
  { key: "weightClassLabel", label: "체급", defaultSelected: true, extract: (r) => r.weightClassLabel },
  { key: "weighInWeightKg", label: "계체(kg)", defaultSelected: true, extract: (r) => r.weighInWeightKg },
  { key: "weighInStatusLabel", label: "계체 상태", defaultSelected: true, extract: (r) => r.weighInStatusLabel },
  { key: "checkInStatusLabel", label: "체크인", defaultSelected: true, extract: (r) => r.checkInStatusLabel },
  { key: "eligibilityLabel", label: "출전 가능", defaultSelected: true, extract: (r) => r.eligibilityLabel },
  { key: "fieldMemo", label: "현장 메모", defaultSelected: true, extract: (r) => r.fieldMemo },
];

const RESULT_FIELDS: ReadonlyArray<ExcelExportField<string, ResultExportRow>> = [
  { key: "matchNumber", label: "경기번호", defaultSelected: true, extract: (r) => String(r.matchNumber ?? "") },
  { key: "bracketTitle", label: "대진표", defaultSelected: true, extract: (r) => r.bracketTitle },
  { key: "divisionLabel", label: "경기구분", defaultSelected: true, extract: (r) => r.divisionLabel ?? "" },
  { key: "fighterName", label: "선수", defaultSelected: true, extract: (r) => r.fighterName },
  { key: "fighterGymName", label: "체육관", defaultSelected: true, extract: (r) => r.fighterGymName ?? "" },
  { key: "opponentName", label: "상대", defaultSelected: true, extract: (r) => r.opponentName ?? "" },
  { key: "resultLabel", label: "결과", defaultSelected: true, extract: (r) => r.resultLabel },
  { key: "resultTypeLabel", label: "승부 방식", defaultSelected: true, extract: (r) => r.resultTypeLabel ?? "" },
  { key: "statusLabel", label: "확정 상태", defaultSelected: true, extract: (r) => r.statusLabel },
  { key: "matchDateLabel", label: "경기일", defaultSelected: true, extract: (r) => r.matchDateLabel ?? "" },
];

const JUDGE_SCORE_FIELDS: ReadonlyArray<ExcelExportField<string, JudgeScoreExportRow>> = [
  { key: "matchNumber", label: "경기번호", defaultSelected: true, extract: (r) => r.matchNumber },
  { key: "courtName", label: "코트", defaultSelected: true, extract: (r) => r.courtName },
  { key: "judgeName", label: "심판", defaultSelected: true, extract: (r) => r.judgeName },
  { key: "source", label: "입력 경로", defaultSelected: true, extract: (r) => r.source },
  { key: "roundNumber", label: "라운드", defaultSelected: true, extract: (r) => String(r.roundNumber) },
  { key: "redScore", label: "RED", defaultSelected: true, extract: (r) => r.redScore },
  { key: "blueScore", label: "BLUE", defaultSelected: true, extract: (r) => r.blueScore },
  { key: "redTotal", label: "RED 합계", defaultSelected: true, extract: (r) => r.redTotal },
  { key: "blueTotal", label: "BLUE 합계", defaultSelected: true, extract: (r) => r.blueTotal },
  { key: "decision", label: "판정", defaultSelected: true, extract: (r) => r.decision },
  { key: "updatedAt", label: "갱신 시각", defaultSelected: true, extract: (r) => r.updatedAt },
];

function winnerCornerLabel(corner: string | null | undefined): string {
  switch (corner) {
    case "red":
      return "홍코너 승";
    case "blue":
      return "청코너 승";
    case "draw":
      return "무승부";
    case "no_contest":
      return "노콘";
    default:
      return "—";
  }
}

export const eventArchivePackageExportService = {
  async buildWeighInWorkbook(
    actor: ActorContext,
    eventId: string,
  ): Promise<Buffer> {
    await requireOrganizerForEvent(actor, eventId);
    const { rows } = await fieldStatusService.listOrganizerEventFieldStatus(
      actor,
      eventId,
    );
    const exportRows: WeighInExportRow[] = rows.map((row) => ({
      fighterName: row.fighterName,
      gymName: row.gymName,
      divisionLabel: row.divisionLabel,
      weightClassLabel: row.weightClassLabel ?? "",
      weighInWeightKg:
        row.weighInWeightKg != null ? String(row.weighInWeightKg) : "",
      weighInStatusLabel: row.weighInStatusLabel,
      checkInStatusLabel: row.checkInStatusLabel,
      eligibilityLabel: row.eligibilityLabel,
      fieldMemo: row.fieldMemo ?? "",
    }));
    return await buildExcelWorkbook({
      sheetName: "계체",
      fields: WEIGH_IN_FIELDS,
      rows: exportRows,
    });
  },

  buildResultsWorkbookFromSnapshot(
    resultsSnapshot: EventArchiveResultsSnapshot,
  ): Promise<Buffer> {
    return buildExcelWorkbook({
      sheetName: "경기결과",
      fields: RESULT_FIELDS,
      rows: resultsSnapshot.rows,
    });
  },

  async buildJudgeScoresWorkbook(
    actor: ActorContext,
    eventId: string,
  ): Promise<Buffer> {
    await requireOrganizerForEvent(actor, eventId);
    const scorecards = await prisma.judgeScorecard.findMany({
      where: {
        eventId,
        status: { in: ["submitted", "revised", "locked"] },
      },
      include: {
        match: {
          select: {
            matchNumber: true,
            court: { select: { name: true } },
          },
        },
        credential: { select: { loginId: true } },
        rounds: { orderBy: { roundNumber: "asc" } },
      },
      orderBy: [{ match: { matchNumber: "asc" } }, { judgeName: "asc" }],
    });

    const exportRows: JudgeScoreExportRow[] = [];
    for (const card of scorecards) {
      const source = isMatchOpsManualLoginId(card.credential.loginId, eventId)
        ? "운영 수동"
        : "심판 포털";
      const decision = winnerCornerLabel(card.winnerCorner);
      if (card.rounds.length === 0) {
        exportRows.push({
          matchNumber: card.match.matchNumber != null ? String(card.match.matchNumber) : "",
          courtName: card.match.court?.name ?? "",
          judgeName: card.judgeName,
          source,
          roundNumber: 0,
          redScore: "",
          blueScore: "",
          redTotal: card.redTotal != null ? String(card.redTotal) : "",
          blueTotal: card.blueTotal != null ? String(card.blueTotal) : "",
          decision,
          updatedAt: card.updatedAt.toISOString(),
        });
        continue;
      }
      for (const round of card.rounds) {
        exportRows.push({
          matchNumber: card.match.matchNumber != null ? String(card.match.matchNumber) : "",
          courtName: card.match.court?.name ?? "",
          judgeName: card.judgeName,
          source,
          roundNumber: round.roundNumber,
          redScore: round.redScore != null ? String(round.redScore) : "",
          blueScore: round.blueScore != null ? String(round.blueScore) : "",
          redTotal: card.redTotal != null ? String(card.redTotal) : "",
          blueTotal: card.blueTotal != null ? String(card.blueTotal) : "",
          decision,
          updatedAt: card.updatedAt.toISOString(),
        });
      }
    }

    return await buildExcelWorkbook({
      sheetName: "심판채점",
      fields: JUDGE_SCORE_FIELDS,
      rows: exportRows,
    });
  },

  async buildBracketPdf(
    actor: ActorContext,
    eventId: string,
    cookieHeader: string | null,
  ): Promise<Buffer> {
    await requireOrganizerForEvent(actor, eventId);
    return await generateBracketPrintPdfBuffer({
      eventId,
      cookieHeader,
      mode: "all-matches",
    });
  },

  async buildWeighInPdf(
    actor: ActorContext,
    eventId: string,
    cookieHeader: string | null,
  ): Promise<Buffer> {
    await requireOrganizerForEvent(actor, eventId);
    return await generateWeighInSheetPdfBuffer({ eventId, cookieHeader });
  },

  async countJudgeScores(eventId: string): Promise<number> {
    return await prisma.judgeScorecard.count({
      where: {
        eventId,
        status: { in: ["submitted", "revised", "locked"] },
      },
    });
  },

  async countWeighInRecords(eventId: string): Promise<number> {
    return await prisma.eventApplication.count({
      where: {
        eventId,
        status: "approved",
        weighInStatus: { not: "pending" },
      },
    });
  },
};
