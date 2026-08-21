import {
  formatDivisionSearchLabel,
  type EventDivisionDisplayInput,
} from "@/lib/event-division-fields";

/**
 * 신청서 표시용 체급 라벨.
 * OTHER / division 미연결 건은 등록 체급 format과 구분한다.
 */
export function formatApplicationDivisionLabel(input: {
  division: EventDivisionDisplayInput | null | undefined;
  divisionSelectionType?: "REGISTERED" | "OTHER" | null;
  requestedDivisionText?: string | null;
}): string {
  if (input.divisionSelectionType === "OTHER") {
    const text = input.requestedDivisionText?.trim();
    return text ? `기타 · ${text}` : "기타 (체급 확인 필요)";
  }
  if (!input.division) {
    return "체급 미지정";
  }
  return formatDivisionSearchLabel(input.division);
}
