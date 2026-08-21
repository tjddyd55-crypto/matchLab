import type { AdditionalInfoStatus } from "@/generated/prisma";

export type AdditionalInfoBulkMode = "adults" | "minors" | "ids";

export type AdditionalInfoBulkPreviewRow = {
  applicationId: string;
  isMinor: boolean;
  contactMissing: boolean;
  additionalInfoStatus: AdditionalInfoStatus;
};

export type AdditionalInfoBulkPreview = {
  mode: AdditionalInfoBulkMode;
  target: number;
  sendable: number;
  contactMissing: number;
  alreadyRequested: number;
  completed: number;
};

/**
 * 일괄 요청 다이얼로그용 카운트 SSOT.
 * 발송가능 = 대상 − 연락처없음 − 완료 (이미요청은 재전송 가능하므로 sendable에 포함).
 */
export function previewAdditionalInfoBulkRequest(
  rows: AdditionalInfoBulkPreviewRow[],
  mode: AdditionalInfoBulkMode,
  selectedIds?: ReadonlySet<string> | readonly string[],
): AdditionalInfoBulkPreview {
  const idSet =
    mode === "ids"
      ? selectedIds instanceof Set
        ? selectedIds
        : new Set(selectedIds ?? [])
      : null;

  const filtered = rows.filter((r) => {
    if (mode === "adults") return !r.isMinor;
    if (mode === "minors") return r.isMinor;
    return idSet?.has(r.applicationId) ?? false;
  });

  let contactMissing = 0;
  let alreadyRequested = 0;
  let completed = 0;
  let sendable = 0;

  for (const r of filtered) {
    if (r.additionalInfoStatus === "COMPLETED") {
      completed += 1;
      continue;
    }
    if (r.contactMissing) {
      contactMissing += 1;
      continue;
    }
    if (
      r.additionalInfoStatus === "REQUESTED" ||
      r.additionalInfoStatus === "IN_PROGRESS"
    ) {
      alreadyRequested += 1;
    }
    sendable += 1;
  }

  return {
    mode,
    target: filtered.length,
    sendable,
    contactMissing,
    alreadyRequested,
    completed,
  };
}
