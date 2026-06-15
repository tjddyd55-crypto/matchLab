import type { BulkApplicationResult } from "@/lib/services/application-organizer-bulk.service";

export function findBulkApplicationFailureReason(
  result: BulkApplicationResult,
  applicationId?: string,
): string | null {
  if (result.failureCount === 0) {
    return null;
  }

  if (applicationId) {
    const matched = result.failures.find(
      (failure) => failure.applicationId === applicationId,
    );
    if (matched) {
      return matched.reason;
    }
  }

  return result.failures[0]?.reason ?? "처리에 실패했습니다.";
}

export function formatBulkApplicationResultSummary(
  result: BulkApplicationResult,
): string {
  const headline = `성공 ${result.successCount}명 · 실패 ${result.failureCount}명`;

  if (result.failureCount === 0) {
    return headline;
  }

  const reasons = [
    ...new Set(result.failures.map((failure) => failure.reason)),
  ].slice(0, 3);

  const reasonLines = reasons.map((reason) => `- ${reason}`).join("\n");
  const overflow =
    result.failures.length > reasons.length
      ? `\n- 외 ${result.failures.length - reasons.length}건`
      : "";

  return `${headline}\n${reasonLines}${overflow}`;
}
