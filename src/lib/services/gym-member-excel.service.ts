import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { GymMemberStatus } from "@/lib/enums";
import { requireGymPortalRead } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { buildExcelWorkbook } from "@/lib/excel-export/build-workbook";
import {
  sanitizeExcelFilenamePart,
  ymdFileStamp,
} from "@/lib/excel-export/filename";
import {
  GYM_MEMBER_EXCEL_EXPORT_FIELDS,
  resolveGymMemberExcelExportFields,
} from "@/lib/gym-member/gym-member-excel-export-fields";
import { gymMemberService } from "@/lib/services/gym-member.service";

export type GymMemberExcelExportScope = "all" | "filtered";

export type GymMemberExcelExportFilters = {
  q?: string;
  status?: GymMemberStatus;
  fighterFilter?: "all" | "fighter" | "non_fighter";
  expirationFilter?: "all" | "active" | "expiring" | "expired" | "no_plan";
  joinedFilter?: "all" | "this-month";
  groupId?: string;
};

export type ExportGymMembersExcelInput = {
  fieldKeys: string[];
  scope: GymMemberExcelExportScope;
  filters?: GymMemberExcelExportFilters;
};

/** @deprecated GymMemberExcelExportFilters 사용 */
export type GymMemberExcelFilters = GymMemberExcelExportFilters;

export const gymMemberExcelService = {
  async buildWorkbook(
    actor: ActorContext,
    input: ExportGymMembersExcelInput,
  ): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
    const access = await requireGymPortalRead(actor);

    const fields = resolveGymMemberExcelExportFields(input.fieldKeys);
    if (fields.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "최소 1개 이상의 항목을 선택해주세요.",
      );
    }
    const unknown = input.fieldKeys.filter(
      (k) => !GYM_MEMBER_EXCEL_EXPORT_FIELDS.some((f) => f.key === k),
    );
    if (unknown.length > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "유효하지 않은 다운로드 항목입니다.",
      );
    }

    const gym = await prisma.gym.findUnique({
      where: { id: access.gymId },
      select: { name: true },
    });
    if (!gym) {
      throw new AppError("NOT_FOUND", "체육관을 찾을 수 없습니다.");
    }

    const listFilters =
      input.scope === "all"
        ? { page: 1, pageSize: 5000 }
        : {
            q: input.filters?.q,
            status: input.filters?.status,
            fighterFilter: input.filters?.fighterFilter ?? "all",
            expirationFilter: input.filters?.expirationFilter ?? "all",
            joinedFilter: input.filters?.joinedFilter ?? "all",
            groupId: input.filters?.groupId,
            page: 1,
            pageSize: 5000,
          };

    const rows = await gymMemberService.listMembersForExport(actor, listFilters);

    if (rows.length === 0) {
      throw new AppError("VALIDATION_ERROR", "다운로드할 회원이 없습니다.");
    }

    const buffer = await buildExcelWorkbook({
      sheetName: "회원목록",
      fields,
      rows,
    });
    const namePart = sanitizeExcelFilenamePart(gym.name || "체육관");
    const filename = `MATCHON_${namePart}_회원_${ymdFileStamp()}.xlsx`;

    return { buffer, filename, rowCount: rows.length };
  },
};
