import "server-only";

import ExcelJS from "exceljs";
import type { ActorContext } from "@/lib/auth/actor-context";
import { GymMemberStatus } from "@/lib/enums";
import { formatUtcDateOnly } from "@/lib/date-only";
import { requireGymPortalRead } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import {
  gymMemberJoinedThisMonthFilter,
} from "@/lib/repositories/gym-member.repository";
import { normalizePhoneDigits } from "@/lib/phone";

export type GymMemberExcelFilters = {
  q?: string;
  status?: GymMemberStatus;
  fighterFilter?: "all" | "fighter" | "non_fighter";
  joinedFilter?: "all" | "this-month";
  groupId?: string;
};

function textSearchOr(q: string) {
  const phoneDigits = normalizePhoneDigits(q);
  return [
    { name: { contains: q, mode: "insensitive" as const } },
    { memberNumber: { contains: q, mode: "insensitive" as const } },
    ...(phoneDigits
      ? [{ phone: { contains: phoneDigits } }, { normalizedPhone: { contains: phoneDigits } }]
      : []),
  ];
}

function ymdFileStamp(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export const gymMemberExcelService = {
  async buildWorkbook(
    actor: ActorContext,
    filters: GymMemberExcelFilters = {},
  ): Promise<{ buffer: Buffer; filename: string }> {
    const access = await requireGymPortalRead(actor);
    const q = filters.q?.trim();

    const rows = await prisma.gymMember.findMany({
      where: {
        gymId: access.gymId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.fighterFilter === "fighter"
          ? { fighter: { isNot: null } }
          : filters.fighterFilter === "non_fighter"
            ? { fighter: { is: null } }
            : {}),
        ...(filters.joinedFilter === "this-month"
          ? { joinedAt: gymMemberJoinedThisMonthFilter() }
          : {}),
        ...(filters.groupId
          ? {
              groupAssignments: {
                some: { groupId: filters.groupId, deletedAt: null },
              },
            }
          : {}),
        ...(q ? { OR: textSearchOr(q) } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        fighter: { select: { id: true, fighterCode: true } },
        groupAssignments: {
          where: { deletedAt: null },
          include: { group: { select: { name: true, isActive: true } } },
        },
        lockerRentals: {
          where: { deletedAt: null, endedAt: null },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
        subscriptions: {
          where: { status: { in: ["active", "paused"] } },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            planNameSnapshot: true,
            startedAt: true,
            endsAt: true,
            priceSnapshot: true,
          },
        },
      },
      take: 5000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MATCHON";
    const sheet = workbook.addWorksheet("회원목록");
    sheet.columns = [
      { header: "회원명", key: "name", width: 14 },
      { header: "연락처", key: "phone", width: 16 },
      { header: "보호자(비상연락처)", key: "guardian", width: 22 },
      { header: "회원등급", key: "rankName", width: 12 },
      { header: "그룹", key: "groups", width: 24 },
      { header: "회원상태", key: "status", width: 10 },
      { header: "이용권명", key: "planName", width: 18 },
      { header: "시작일", key: "startedAt", width: 12 },
      { header: "종료일", key: "endsAt", width: 12 },
      { header: "결제금액", key: "paymentAmount", width: 12 },
      { header: "출석문자 수신", key: "sms", width: 12 },
      { header: "사물함 번호", key: "locker", width: 12 },
      { header: "사물함 시작일", key: "lockerStart", width: 12 },
      { header: "사물함 종료일", key: "lockerEnds", width: 12 },
      { header: "사물함 이용금액", key: "lockerAmount", width: 14 },
      { header: "메모", key: "memo", width: 28 },
    ];

    for (const row of rows) {
      const sub = row.subscriptions[0] ?? null;
      const locker = row.lockerRentals[0] ?? null;
      const guardianName =
        row.guardianName?.trim() || row.emergencyContactName?.trim() || "";
      const guardianPhone =
        row.guardianPhone?.trim() || row.emergencyContactPhone?.trim() || "";
      const groups = row.groupAssignments
        .filter((a) => a.group.isActive)
        .map((a) => a.group.name)
        .join(", ");

      const excelRow = sheet.addRow({
        name: row.name,
        phone: row.phone ?? "",
        guardian: [guardianName, guardianPhone].filter(Boolean).join(" / "),
        rankName: row.rankName ?? "",
        groups,
        status: row.status,
        planName: sub?.planNameSnapshot ?? "",
        startedAt: sub?.startedAt ? formatUtcDateOnly(sub.startedAt, "-") : "",
        endsAt: sub?.endsAt ? formatUtcDateOnly(sub.endsAt, "-") : "",
        paymentAmount: sub?.priceSnapshot ?? null,
        sms: row.smsOptOut ? "거부" : "수신",
        locker: locker?.lockerLabel ?? "",
        lockerStart: locker?.startedAt
          ? formatUtcDateOnly(locker.startedAt, "-")
          : "",
        lockerEnds: locker?.endsAt
          ? formatUtcDateOnly(locker.endsAt, "-")
          : "",
        lockerAmount: locker ? locker.amount : null,
        memo: row.memo ?? "",
      });
      // 전화번호 선행 0 보존 — text
      excelRow.getCell("phone").numFmt = "@";
      if (typeof excelRow.getCell("paymentAmount").value === "number") {
        excelRow.getCell("paymentAmount").numFmt = "#,##0";
      }
      if (typeof excelRow.getCell("lockerAmount").value === "number") {
        excelRow.getCell("lockerAmount").numFmt = "#,##0";
      }
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      filename: `MATCHON_회원목록_${ymdFileStamp()}.xlsx`,
    };
  },
};
