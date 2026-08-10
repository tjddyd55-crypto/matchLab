/**
 * 회원 Excel Import — Preview / Commit.
 * MATCHON 재등록 횟수에는 excel_import / sourceRegistrationType 미포함.
 */
import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymMemberImportBatchStatus,
  GymMemberImportSourceRegistrationType,
  GymMemberPaymentMethod,
  GymMemberPaymentStatus,
  GymMemberStatus,
  GymMemberSubscriptionCreationSource,
  GymMemberSubscriptionStatus,
  GymMembershipDurationType,
  GymSalesCategory,
} from "@/lib/enums";
import { parseDateOnlyString, toUtcDateOnly } from "@/lib/date-only";
import {
  parseImportAmount,
  parseImportDate,
  parseMemberImportWorkbook,
  type ParsedMemberImportRow,
} from "@/lib/gym-member-import/excel-parser";
import { requireGymPortalWrite } from "@/lib/gym-portal-access";
import { normalizePhoneDigits } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";

export type ImportRowDecision =
  | "create_member"
  | "match_existing"
  | "duplicate_review"
  | "skip_idempotent"
  | "error";

export type ImportPreviewRow = {
  excelRow: number;
  name: string;
  phone: string;
  normalizedPhone: string;
  memberNumber: string;
  statusRaw: string;
  mappedStatus: GymMemberStatus | null;
  sourceRegistrationType: GymMemberImportSourceRegistrationType;
  sourceRegistrationLabel: string;
  className: string;
  planName: string;
  planId: string | null;
  planNeedsCreate: boolean;
  membershipType: string;
  instructor: string;
  paidAt: string | null;
  startedAt: string | null;
  endsAt: string | null;
  periodText: string;
  remainingDaysText: string;
  remainingSessionsText: string;
  reservedSessionsText: string;
  usedSessionsText: string;
  amount: number | null;
  taxAmount: number | null;
  memo: string;
  excelGradeLabel: string;
  groupName: string;
  branchName: string;
  decision: ImportRowDecision;
  decisionLabel: string;
  matchedMemberId: string | null;
  matchedMemberName: string | null;
  errors: string[];
  warnings: string[];
};

export type ImportPreviewResult = {
  batchId: string;
  fileName: string;
  headerRow: number;
  totalRows: number;
  counts: {
    createMember: number;
    matchExisting: number;
    duplicateReview: number;
    skipIdempotent: number;
    error: number;
    planNeedsCreate: number;
    sourceNew: number;
    sourceRenewal: number;
    groupNames: Record<string, number>;
    planNames: Record<string, number>;
    amountSum: number;
  };
  rows: ImportPreviewRow[];
  plans: { id: string; name: string; price: number }[];
  groups: { id: string; name: string }[];
};

const STATUS_MAP: Record<string, GymMemberStatus> = {
  수강: GymMemberStatus.active,
  이용중: GymMemberStatus.active,
  활성: GymMemberStatus.active,
  휴회: GymMemberStatus.paused,
  정지: GymMemberStatus.paused,
  퇴회: GymMemberStatus.withdrawn,
  탈퇴: GymMemberStatus.withdrawn,
};

function mapSourceType(raw: string): {
  type: GymMemberImportSourceRegistrationType;
  label: string;
} {
  const t = raw.trim();
  if (t === "신규") {
    return {
      type: GymMemberImportSourceRegistrationType.new_member,
      label: "신규",
    };
  }
  if (t === "재등록") {
    return {
      type: GymMemberImportSourceRegistrationType.renewal,
      label: "재등록",
    };
  }
  return {
    type: GymMemberImportSourceRegistrationType.unknown,
    label: t || "미상",
  };
}

function inferDuration(
  planName: string,
  periodText: string,
): { durationType: GymMembershipDurationType; durationValue: number | null } {
  const src = `${planName} ${periodText}`;
  const m = src.match(/(\d+)\s*개월/);
  if (m) {
    return {
      durationType: GymMembershipDurationType.months,
      durationValue: Number(m[1]),
    };
  }
  const d = src.match(/(\d+)\s*일/);
  if (d) {
    return {
      durationType: GymMembershipDurationType.days,
      durationValue: Number(d[1]),
    };
  }
  return {
    durationType: GymMembershipDurationType.months,
    durationValue: 1,
  };
}

async function findIdempotentSubscription(input: {
  gymId: string;
  memberId: string;
  planName: string;
  startedAt: Date;
  endsAt: Date | null;
  paidAt: Date;
  amount: number;
}) {
  const subs = await prisma.gymMemberSubscription.findMany({
    where: {
      gymId: input.gymId,
      gymMemberId: input.memberId,
      planNameSnapshot: input.planName,
      startedAt: input.startedAt,
      endsAt: input.endsAt,
      status: { not: GymMemberSubscriptionStatus.cancelled },
    },
    include: {
      payments: {
        where: { cancelledAt: null, amount: input.amount },
        take: 5,
      },
    },
  });
  return subs.find((s) =>
    s.payments.some(
      (p) =>
        toUtcDateOnly(p.paidAt).getTime() ===
        toUtcDateOnly(input.paidAt).getTime(),
    ),
  );
}

export const gymMemberImportService = {
  async analyzeWorkbook(
    actor: ActorContext,
    input: { fileName: string; buffer: Buffer },
  ): Promise<ImportPreviewResult> {
    const access = await requireGymPortalWrite(actor);
    const parsed = await parseMemberImportWorkbook(input.buffer);

    const [plans, groups, members] = await Promise.all([
      prisma.gymMembershipPlan.findMany({
        where: { gymId: access.gymId, deletedAt: null },
        select: { id: true, name: true, price: true, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.gymMemberGroup.findMany({
        where: { gymId: access.gymId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.gymMember.findMany({
        where: { gymId: access.gymId, deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          normalizedPhone: true,
          memberNumber: true,
        },
      }),
    ]);

    const planByName = new Map(
      plans.filter((p) => p.isActive).map((p) => [p.name, p]),
    );
    const byPhone = new Map<string, typeof members>();
    const byMemberNo = new Map<string, typeof members>();
    for (const m of members) {
      const arr = byPhone.get(m.normalizedPhone) ?? [];
      arr.push(m);
      byPhone.set(m.normalizedPhone, arr);
      if (m.memberNumber) {
        const arr2 = byMemberNo.get(m.memberNumber) ?? [];
        arr2.push(m);
        byMemberNo.set(m.memberNumber, arr2);
      }
    }

    // file-internal phone duplicates
    const filePhoneCounts = new Map<string, number>();
    for (const row of parsed.rows) {
      const n = normalizePhoneDigits(row.values["연락처"] ?? "");
      if (!n) continue;
      filePhoneCounts.set(n, (filePhoneCounts.get(n) ?? 0) + 1);
    }

    const previewRows: ImportPreviewRow[] = [];
    for (const row of parsed.rows) {
      previewRows.push(
        await buildPreviewRow({
          row,
          gymId: access.gymId,
          planByName,
          byPhone,
          byMemberNo,
          filePhoneCounts,
        }),
      );
    }

    const counts = {
      createMember: 0,
      matchExisting: 0,
      duplicateReview: 0,
      skipIdempotent: 0,
      error: 0,
      planNeedsCreate: 0,
      sourceNew: 0,
      sourceRenewal: 0,
      groupNames: {} as Record<string, number>,
      planNames: {} as Record<string, number>,
      amountSum: 0,
    };
    for (const r of previewRows) {
      if (r.decision === "create_member") counts.createMember += 1;
      if (r.decision === "match_existing") counts.matchExisting += 1;
      if (r.decision === "duplicate_review") counts.duplicateReview += 1;
      if (r.decision === "skip_idempotent") counts.skipIdempotent += 1;
      if (r.decision === "error") counts.error += 1;
      if (r.planNeedsCreate) counts.planNeedsCreate += 1;
      if (r.sourceRegistrationLabel === "신규") counts.sourceNew += 1;
      if (r.sourceRegistrationLabel === "재등록") counts.sourceRenewal += 1;
      if (r.groupName) {
        counts.groupNames[r.groupName] =
          (counts.groupNames[r.groupName] ?? 0) + 1;
      }
      if (r.planName) {
        counts.planNames[r.planName] = (counts.planNames[r.planName] ?? 0) + 1;
      }
      if (r.amount != null) counts.amountSum += r.amount;
    }

    const batch = await prisma.gymMemberImportBatch.create({
      data: {
        gymId: access.gymId,
        originalFileName: input.fileName,
        status: GymMemberImportBatchStatus.preview,
        totalRows: previewRows.length,
        meta: {
          headerRow: parsed.headerRow,
          counts,
          previewAt: new Date().toISOString(),
        },
        createdByUserId: actor.userId,
      },
    });

    return {
      batchId: batch.id,
      fileName: input.fileName,
      headerRow: parsed.headerRow,
      totalRows: previewRows.length,
      counts,
      rows: previewRows,
      plans: plans.map((p) => ({ id: p.id, name: p.name, price: p.price })),
      groups: groups.map((g) => ({ id: g.id, name: g.name })),
    };
  },

  async commitImport(
    actor: ActorContext,
    input: {
      batchId: string;
      fileName: string;
      buffer: Buffer;
      planBindings: Record<string, string>;
      memberBindings: Record<string, string>;
      skipRows: number[];
      createMissingGroups: boolean;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const batch = await prisma.gymMemberImportBatch.findFirst({
      where: { id: input.batchId, gymId: access.gymId },
    });
    if (!batch) throw new AppError("NOT_FOUND", "Import 배치를 찾을 수 없습니다.");

    const parsed = await parseMemberImportWorkbook(input.buffer);
    const [plans, members] = await Promise.all([
      prisma.gymMembershipPlan.findMany({
        where: { gymId: access.gymId, deletedAt: null, isActive: true },
        select: { id: true, name: true, price: true },
      }),
      prisma.gymMember.findMany({
        where: { gymId: access.gymId, deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          normalizedPhone: true,
          memberNumber: true,
        },
      }),
    ]);
    const planByName = new Map(plans.map((p) => [p.name, p]));
    const byPhone = new Map<string, typeof members>();
    const byMemberNo = new Map<string, typeof members>();
    for (const m of members) {
      const arr = byPhone.get(m.normalizedPhone) ?? [];
      arr.push(m);
      byPhone.set(m.normalizedPhone, arr);
      if (m.memberNumber) {
        const arr2 = byMemberNo.get(m.memberNumber) ?? [];
        arr2.push(m);
        byMemberNo.set(m.memberNumber, arr2);
      }
    }
    const filePhoneCounts = new Map<string, number>();
    for (const row of parsed.rows) {
      const n = normalizePhoneDigits(row.values["연락처"] ?? "");
      if (!n) continue;
      filePhoneCounts.set(n, (filePhoneCounts.get(n) ?? 0) + 1);
    }

    const previewRows: ImportPreviewRow[] = [];
    for (const row of parsed.rows) {
      previewRows.push(
        await buildPreviewRow({
          row,
          gymId: access.gymId,
          planByName,
          byPhone,
          byMemberNo,
          filePhoneCounts,
        }),
      );
    }

    const skipSet = new Set(input.skipRows);
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const rowResults: Array<Record<string, unknown>> = [];

    for (const row of previewRows) {
      if (skipSet.has(row.excelRow) || row.decision === "error") {
        if (row.decision === "error") failed += 1;
        else skipped += 1;
        rowResults.push({
          excelRow: row.excelRow,
          status: row.decision === "error" ? "failed" : "skipped",
          errors: row.errors,
        });
        continue;
      }
      if (
        row.decision === "duplicate_review" &&
        !input.memberBindings[String(row.excelRow)]
      ) {
        skipped += 1;
        rowResults.push({
          excelRow: row.excelRow,
          status: "skipped",
          reason: "duplicate_unresolved",
        });
        continue;
      }
      if (row.decision === "skip_idempotent") {
        skipped += 1;
        rowResults.push({
          excelRow: row.excelRow,
          status: "skipped",
          reason: "idempotent",
        });
        continue;
      }

      try {
        const result = await importOneRow({
          actor,
          gymId: access.gymId,
          batchId: input.batchId,
          row,
          planBinding: input.planBindings[String(row.excelRow)] ?? null,
          memberBinding: input.memberBindings[String(row.excelRow)] ?? null,
          createMissingGroups: input.createMissingGroups,
        });
        if (result.skipped) skipped += 1;
        else success += 1;
        rowResults.push({ excelRow: row.excelRow, status: result.skipped ? "skipped" : "success", ...result });
      } catch (e) {
        failed += 1;
        rowResults.push({
          excelRow: row.excelRow,
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    await prisma.gymMemberImportBatch.update({
      where: { id: input.batchId },
      data: {
        status: GymMemberImportBatchStatus.completed,
        successRows: success,
        failedRows: failed,
        skippedRows: skipped,
        totalRows: previewRows.length,
        completedAt: new Date(),
        meta: JSON.parse(
          JSON.stringify({
            ...(typeof batch.meta === "object" && batch.meta
              ? (batch.meta as Record<string, unknown>)
              : {}),
            rowResults: rowResults.slice(0, 200),
          }),
        ),
      },
    });

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_import_completed,
      targetType: "GymMemberImportBatch",
      targetId: input.batchId,
      afterData: {
        fileName: input.fileName,
        success,
        failed,
        skipped,
        total: previewRows.length,
      },
    });

    return {
      batchId: input.batchId,
      success,
      failed,
      skipped,
      total: previewRows.length,
    };
  },

  countMatchonRenewals(subscriptions: { creationSource: string }[]) {
    return subscriptions.filter(
      (s) => s.creationSource === GymMemberSubscriptionCreationSource.renew,
    ).length;
  },
};

async function buildPreviewRow(input: {
  row: ParsedMemberImportRow;
  gymId: string;
  planByName: Map<string, { id: string; name: string; price: number }>;
  byPhone: Map<string, { id: string; name: string; normalizedPhone: string; memberNumber: string }[]>;
  byMemberNo: Map<string, { id: string; name: string; normalizedPhone: string; memberNumber: string }[]>;
  filePhoneCounts: Map<string, number>;
}): Promise<ImportPreviewRow> {
  const v = input.row.values;
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = v["회원명"]?.trim() ?? "";
  const phoneRaw = v["연락처"]?.trim() ?? "";
  const normalizedPhone = normalizePhoneDigits(phoneRaw);
  const memberNumber = (v["회원번호"] ?? "").trim();
  const statusRaw = (v["상태"] ?? "").trim();
  const mappedStatus = STATUS_MAP[statusRaw] ?? null;
  if (!name) errors.push("회원명 필수");
  if (!normalizedPhone) errors.push("연락처 필수");
  else if (!/^01[016789]\d{7,8}$/.test(normalizedPhone)) {
    errors.push("연락처 형식 오류");
  }
  if (statusRaw && !mappedStatus) {
    errors.push(`알 수 없는 상태: ${statusRaw}`);
  }
  const src = mapSourceType(v["구분"] ?? "");
  const planName = (v["회원권"] ?? "").trim();
  if (!planName) errors.push("회원권 필수");
  const plan = planName ? input.planByName.get(planName) : undefined;
  const startedAt = parseImportDate(v["이용시작일"] ?? "");
  const endsAt = parseImportDate(v["이용종료일"] ?? "");
  const paidAt = parseImportDate(v["거래일"] ?? "") ?? startedAt;
  if (startedAt && endsAt && startedAt > endsAt) {
    errors.push("종료일이 시작일보다 빠릅니다.");
  }
  const amount = parseImportAmount(v["강습료"] ?? "");
  if (amount == null) errors.push("강습료 형식 오류");
  const taxAmount = parseImportAmount(v["세액"] ?? "") ?? 0;

  let matchedMemberId: string | null = null;
  let matchedMemberName: string | null = null;
  let decision: ImportRowDecision = "create_member";
  let decisionLabel = "신규 회원";

  const phoneHits = normalizedPhone
    ? (input.byPhone.get(normalizedPhone) ?? [])
    : [];
  const noHits = memberNumber
    ? (input.byMemberNo.get(memberNumber) ?? [])
    : [];
  const fileDup = (input.filePhoneCounts.get(normalizedPhone) ?? 0) > 1;

  if (errors.length) {
    decision = "error";
    decisionLabel = "오류";
  } else if (fileDup || phoneHits.length > 1 || noHits.length > 1) {
    // 같은 전화/파일 중복이라도 이름까지 유일하게 맞으면 자동 매칭.
    // (고지윤/고시윤처럼 의도적 별도 회원 재업로드 시 멱등 skip 가능)
    const nameOnPhone = phoneHits.filter((m) => m.name === name);
    const nameOnMemberNo = noHits.filter((m) => m.name === name);
    if (nameOnPhone.length === 1) {
      decision = "match_existing";
      decisionLabel = "기존 회원 매칭";
      matchedMemberId = nameOnPhone[0]!.id;
      matchedMemberName = nameOnPhone[0]!.name;
      warnings.push("동일 전화번호 다수 — 이름 일치로 매칭");
    } else if (nameOnMemberNo.length === 1 && phoneHits.length <= 1) {
      decision = "match_existing";
      decisionLabel = "기존 회원 매칭";
      matchedMemberId = nameOnMemberNo[0]!.id;
      matchedMemberName = nameOnMemberNo[0]!.name;
      warnings.push("동일 회원번호 다수 — 이름 일치로 매칭");
    } else {
      decision = "duplicate_review";
      decisionLabel = "중복 의심";
      warnings.push("동일 전화번호/회원번호 충돌 — 수동 확인");
      if (phoneHits.length === 1) {
        matchedMemberId = phoneHits[0]!.id;
        matchedMemberName = phoneHits[0]!.name;
      }
    }
  } else if (phoneHits.length === 1) {
    decision = "match_existing";
    decisionLabel = "기존 회원 매칭";
    matchedMemberId = phoneHits[0]!.id;
    matchedMemberName = phoneHits[0]!.name;
  } else if (noHits.length === 1) {
    decision = "match_existing";
    decisionLabel = "기존 회원 매칭";
    matchedMemberId = noHits[0]!.id;
    matchedMemberName = noHits[0]!.name;
  } else if (
    phoneHits.length === 0 &&
    name &&
    normalizedPhone
  ) {
    // name+phone exact among DB
    const namePhone = [...input.byPhone.values()]
      .flat()
      .filter(
        (m) =>
          m.name === name && m.normalizedPhone === normalizedPhone,
      );
    if (namePhone.length === 1) {
      decision = "match_existing";
      decisionLabel = "기존 회원 매칭";
      matchedMemberId = namePhone[0]!.id;
      matchedMemberName = namePhone[0]!.name;
    }
  }

  if (
    decision !== "error" &&
    matchedMemberId &&
    startedAt &&
    amount != null &&
    paidAt
  ) {
    const started = parseDateOnlyString(startedAt);
    const ended = endsAt ? parseDateOnlyString(endsAt) : null;
    const paid = parseDateOnlyString(paidAt);
    if (started && paid) {
      const existing = await findIdempotentSubscription({
        gymId: input.gymId,
        memberId: matchedMemberId,
        planName,
        startedAt: started,
        endsAt: ended,
        paidAt: paid,
        amount,
      });
      if (existing) {
        decision = "skip_idempotent";
        decisionLabel = "이미 등록된 내역";
      }
    }
  }

  return {
    excelRow: input.row.excelRow,
    name,
    phone: phoneRaw,
    normalizedPhone,
    memberNumber,
    statusRaw,
    mappedStatus,
    sourceRegistrationType: src.type,
    sourceRegistrationLabel: src.label,
    className: (v["수업명"] ?? "").trim(),
    planName,
    planId: plan?.id ?? null,
    planNeedsCreate: Boolean(planName && !plan),
    membershipType: (v["회원권타입"] ?? "").trim(),
    instructor: (v["담당강사"] ?? "").trim(),
    paidAt,
    startedAt,
    endsAt,
    periodText: (v["기간/횟수"] ?? "").trim(),
    remainingDaysText: (v["잔여일"] ?? "").trim(),
    remainingSessionsText: (v["잔여횟수"] ?? "").trim(),
    reservedSessionsText: (v["예약횟수"] ?? "").trim(),
    usedSessionsText: (v["이용횟수"] ?? "").trim(),
    amount,
    taxAmount,
    memo: (v["회원권메모"] ?? "").trim(),
    excelGradeLabel: (v["회원등급"] ?? "").trim(),
    groupName: (v["그룹"] ?? "").trim(),
    branchName: (v["지점명"] ?? "").trim(),
    decision,
    decisionLabel,
    matchedMemberId,
    matchedMemberName,
    errors,
    warnings,
  };
}

async function importOneRow(input: {
  actor: ActorContext;
  gymId: string;
  batchId: string;
  row: ImportPreviewRow;
  planBinding: string | null;
  memberBinding: string | null;
  createMissingGroups: boolean;
}) {
  const { row, gymId, batchId, actor } = input;
  if (!row.startedAt || row.amount == null || !row.paidAt) {
    throw new AppError("VALIDATION_ERROR", `${row.excelRow}행 필수값 부족`);
  }
  const amount = row.amount;
  const startedAt = parseDateOnlyString(row.startedAt);
  const endsAt = row.endsAt ? parseDateOnlyString(row.endsAt) : null;
  const paidAt = parseDateOnlyString(row.paidAt);
  if (!startedAt || !paidAt) {
    throw new AppError("VALIDATION_ERROR", `${row.excelRow}행 날짜 오류`);
  }

  return prisma.$transaction(async (tx) => {
    let planId = row.planId;
    if (input.planBinding && input.planBinding !== "__create__") {
      planId = input.planBinding;
    }
    // 신규 plan은 Preview에서 사용자가 `__create__`를 확정한 경우에만 생성
    if (!planId && input.planBinding === "__create__") {
      const existingByName = await tx.gymMembershipPlan.findFirst({
        where: { gymId, name: row.planName, deletedAt: null },
        select: { id: true },
      });
      if (existingByName) {
        planId = existingByName.id;
      } else {
        const dur = inferDuration(row.planName, row.periodText);
        const created = await tx.gymMembershipPlan.create({
          data: {
            gymId,
            name: row.planName,
            durationType: dur.durationType,
            durationValue: dur.durationValue,
            price: amount,
            isActive: true,
            sortOrder: 100,
          },
        });
        planId = created.id;
      }
    }
    if (!planId) {
      throw new AppError("VALIDATION_ERROR", `이용권 매핑 필요: ${row.planName}`);
    }

    let memberId: string | null = null;
    if (input.memberBinding === "__create__") {
      memberId = null;
    } else if (input.memberBinding) {
      memberId = input.memberBinding;
    } else if (row.decision === "match_existing") {
      memberId = row.matchedMemberId;
    }

    if (!memberId) {
      // create member — preserve excel memberNumber if unique else auto
      let memberNumber = row.memberNumber;
      if (memberNumber) {
        const clash = await tx.gymMember.findFirst({
          where: { gymId, memberNumber, deletedAt: null },
          select: { id: true },
        });
        if (clash) {
          throw new AppError(
            "VALIDATION_ERROR",
            `회원번호 충돌: ${memberNumber}`,
          );
        }
      } else {
        memberNumber = await gymMemberRepository.nextMemberNumber(gymId, tx);
      }

      const member = await tx.gymMember.create({
        data: {
          gymId,
          memberNumber,
          name: row.name,
          phone: row.normalizedPhone,
          normalizedPhone: row.normalizedPhone,
          status: row.mappedStatus ?? GymMemberStatus.active,
          // excel grade is NOT rankName
          memo: null,
          createdByUserId: actor.userId,
        },
      });
      memberId = member.id;
    }

    // group
    if (row.groupName && input.createMissingGroups !== false) {
      let group = await tx.gymMemberGroup.findFirst({
        where: { gymId, name: row.groupName, deletedAt: null },
      });
      if (!group && input.createMissingGroups) {
        group = await tx.gymMemberGroup.create({
          data: {
            gymId,
            name: row.groupName,
            isActive: true,
            sortOrder: 50,
          },
        });
      }
      if (group) {
        const existing = await tx.gymMemberGroupAssignment.findFirst({
          where: {
            gymMemberId: memberId,
            groupId: group.id,
            deletedAt: null,
          },
        });
        if (!existing) {
          await tx.gymMemberGroupAssignment.create({
            data: {
              gymId,
              gymMemberId: memberId,
              groupId: group.id,
            },
          });
        }
      }
    }

    const idempotent = await findIdempotentSubscription({
      gymId,
      memberId,
      planName: row.planName,
      startedAt,
      endsAt,
      paidAt,
      amount,
    });
    if (idempotent) {
      return { memberId, subscriptionId: idempotent.id, skipped: true };
    }

    // end current active subs only when creating a new subscription
    await tx.gymMemberSubscription.updateMany({
      where: {
        gymMemberId: memberId,
        status: {
          in: [
            GymMemberSubscriptionStatus.active,
            GymMemberSubscriptionStatus.paused,
          ],
        },
      },
      data: {
        status: GymMemberSubscriptionStatus.ended,
        cancelledAt: new Date(),
      },
    });

    const subscription = await tx.gymMemberSubscription.create({
      data: {
        gymId,
        gymMemberId: memberId,
        planId,
        planNameSnapshot: row.planName,
        priceSnapshot: amount,
        startedAt,
        endsAt,
        status: GymMemberSubscriptionStatus.active,
        creationSource: GymMemberSubscriptionCreationSource.excel_import,
        sourceRegistrationType: row.sourceRegistrationType,
        importBatchId: batchId,
        memo: row.memo || null,
        importMeta: {
          className: row.className || null,
          membershipType: row.membershipType || null,
          periodText: row.periodText || null,
          remainingDaysText: row.remainingDaysText || null,
          remainingSessionsText: row.remainingSessionsText || null,
          reservedSessionsText: row.reservedSessionsText || null,
          usedSessionsText: row.usedSessionsText || null,
          excelGradeLabel: row.excelGradeLabel || null,
          branchName: row.branchName || null,
          instructor: row.instructor || null,
        },
        createdByUserId: actor.userId,
      },
    });

    const payment = await tx.gymMemberPayment.create({
      data: {
        gymId,
        gymMemberId: memberId,
        subscriptionId: subscription.id,
        paidAt,
        amount,
        listPrice: amount,
        discountAmount: 0,
        taxAmount: row.taxAmount ?? 0,
        paymentMethod: GymMemberPaymentMethod.other,
        status: GymMemberPaymentStatus.paid,
        category: GymSalesCategory.membership,
        importBatchId: batchId,
        memo: row.memo || null,
        createdByUserId: actor.userId,
      },
    });

    return {
      memberId,
      subscriptionId: subscription.id,
      paymentId: payment.id,
    };
  });
}
