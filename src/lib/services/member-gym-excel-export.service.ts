import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerScope } from "@/lib/permissions";
import { resolveMemberGymOwnerAccountStatus } from "@/lib/member-gym/owner-account";
import {
  MEMBER_GYM_EXCEL_EXPORT_FIELDS,
  resolveMemberGymExcelExportFields,
  type MemberGymExcelExportRow,
} from "@/lib/member-gym/member-gym-excel-export-fields";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";
import { buildExcelWorkbook } from "@/lib/excel-export/build-workbook";
import {
  sanitizeExcelFilenamePart,
  ymdFileStamp,
} from "@/lib/excel-export/filename";
import { MEMBER_GYM_STATUS_LABEL } from "@/lib/ui-labels/member-gym";
import { MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL } from "@/lib/ui-labels/member-gym-owner";
import { prisma } from "@/lib/prisma";
import type { AssociationMemberGymStatus } from "@/lib/enums";

export type MemberGymExcelExportScope = "all" | "filtered";

export type ExportMemberGymsExcelInput = {
  fieldKeys: string[];
  scope: MemberGymExcelExportScope;
  memberGymIds?: string[];
  filters?: {
    q?: string;
    status?: AssociationMemberGymStatus;
  };
};

function mapRow(
  row: Awaited<ReturnType<typeof memberGymRepository.listMemberGyms>>[number],
): MemberGymExcelExportRow {
  const accountStatus = resolveMemberGymOwnerAccountStatus({
    owner: row.gym.ownerUser,
    ownerAccessSuspendedAt: row.ownerAccessSuspendedAt,
    ownerInviteTokenHash: row.ownerInviteTokenHash,
    ownerInviteExpiresAt: row.ownerInviteExpiresAt,
  });
  return {
    id: row.id,
    gymName: row.gym.name,
    memberCode: row.memberCode,
    accountStatusLabel: MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL[accountStatus],
    fighterTotal: row.gym._count.fighters,
    fighterActive: row.gym.fighters.length,
    statusLabel: MEMBER_GYM_STATUS_LABEL[row.status],
    approvedAt: row.approvedAt,
  };
}

export const memberGymExcelExportService = {
  async buildWorkbook(
    actor: ActorContext,
    input: ExportMemberGymsExcelInput,
  ): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
    const organizerId = await requireAssociationOrganizerScope(actor);

    const fields = resolveMemberGymExcelExportFields(input.fieldKeys);
    if (fields.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "최소 1개 이상의 항목을 선택해주세요.",
      );
    }
    const unknown = input.fieldKeys.filter(
      (k) => !MEMBER_GYM_EXCEL_EXPORT_FIELDS.some((f) => f.key === k),
    );
    if (unknown.length > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "유효하지 않은 다운로드 항목입니다.",
      );
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: { name: true },
    });
    if (!organizer) {
      throw new AppError("NOT_FOUND", "협회를 찾을 수 없습니다.");
    }

    let exportRows: MemberGymExcelExportRow[];

    if (input.scope === "filtered") {
      const ids = input.memberGymIds ?? [];
      if (ids.length === 0) {
        throw new AppError(
          "VALIDATION_ERROR",
          "다운로드할 회원사가 없습니다.",
        );
      }
      const dbRows = await memberGymRepository.listMemberGyms({
        organizerId,
        q: input.filters?.q,
        status: input.filters?.status,
      });
      const byId = new Map(dbRows.map((r) => [r.id, mapRow(r)]));
      exportRows = [];
      for (const id of ids) {
        const row = byId.get(id);
        if (!row) {
          throw new AppError(
            "VALIDATION_ERROR",
            "선택한 회원사 중 이 협회에 없는 항목이 있습니다.",
          );
        }
        exportRows.push(row);
      }
    } else {
      const dbRows = await memberGymRepository.listMemberGyms({
        organizerId,
      });
      exportRows = dbRows.map(mapRow);
    }

    if (exportRows.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "다운로드할 회원사가 없습니다.",
      );
    }

    const buffer = await buildExcelWorkbook({
      sheetName: "회원사",
      fields,
      rows: exportRows,
    });
    const namePart = sanitizeExcelFilenamePart(organizer.name || "협회");
    const filename = `MATCHON_${namePart}_회원사_${ymdFileStamp()}.xlsx`;

    return { buffer, filename, rowCount: exportRows.length };
  },
};
