/** 2차 추가정보 알림 본문 템플릿 */

export function buildAdultAdditionalInfoMessage(input: {
  eventTitle: string;
  fighterName: string;
  linkUrl: string;
}): string {
  return [
    "[MATCHON]",
    input.eventTitle,
    `${input.fighterName} 선수님, 대회 참가 추가정보 입력이 필요합니다.`,
    "아래 링크에서 주민등록번호·주소·동의·서명을 작성해 주세요.",
    input.linkUrl,
  ].join("\n");
}

export function buildMinorAdditionalInfoMessage(input: {
  eventTitle: string;
  fighterName: string;
  linkUrl: string;
}): string {
  return [
    "[MATCHON]",
    "보호자님께 안내드립니다.",
    `${input.fighterName} 선수의 대회 참가 추가정보 입력이 필요합니다.`,
    `대회: ${input.eventTitle}`,
    "아래 링크에서 추가정보를 작성해 주세요.",
    input.linkUrl,
  ].join("\n");
}
